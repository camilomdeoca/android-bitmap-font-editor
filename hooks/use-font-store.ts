import { Font, font2serializable, Glyph, serializable2font, SerializableFont } from "@/lib/bdfparser/bdfparser";
import { create } from "zustand";
import { createMMKV } from 'react-native-mmkv';

const FONT_METADATA_KEY = 'metadata';
const SELECTED_CODEPOINT_KEY = 'selected-codepoint';

const nonSelectedFontsStorage = createMMKV({ id: 'non-selected-fonts' });

// Selected font storage
const fontStorage = createMMKV({ id: 'current-font' });
const glyphStorage = createMMKV({ id: 'current-font-glyphs' });

interface FontMetadata {
  headers: any;
  props: [string, string | null][];
  propsComments: string[];
}

type State = {
  nonSelectedFonts: SerializableFont[],
  font: Font | undefined,
  selectedCodepoint: number,
};

type Actions = {
  addFont: (font: Font) => void,
  deleteFont: (idx: number) => void,
  setSelectedFontIdx: (idx: number | undefined) => void,
  updateGlyph: (codepoint: number, glyph: Glyph) => void,
  deleteGlyph: (codepoint: number) => void,
  setSelectedCodepoint: (codepoint: number) => void,
};

function getGlyphHexKey(codepoint: number): string {
  return codepoint.toString(16);
}

function saveSelectedCodepointToMMKV(codepoint: number): void {
  fontStorage.set(SELECTED_CODEPOINT_KEY, codepoint);
}

function loadSelectedCodepointFromMMKV(): number | undefined {
  const data = fontStorage.getNumber(SELECTED_CODEPOINT_KEY);
  return data;
}

function saveFontMetadataToMMKV(font: Font): void {
  const metadata: FontMetadata = {
    headers: font.headers,
    props: [...font.props.entries()],
    propsComments: font.propsComments,
  };
  fontStorage.set(FONT_METADATA_KEY, JSON.stringify(metadata));
}

function loadFontMetadataFromMMKV(): FontMetadata | undefined {
  const metadataData = fontStorage.getString(FONT_METADATA_KEY);
  return metadataData ? JSON.parse(metadataData) : undefined;
}

function saveGlyphToMMKV(codepoint: number, glyph: Glyph): void {
  const hexKey = getGlyphHexKey(codepoint);
  glyphStorage.set(hexKey, JSON.stringify(glyph));
}

function deleteGlyphFromMMKV(codepoint: number): void {
  const hexKey = getGlyphHexKey(codepoint);
  glyphStorage.remove(hexKey);
}

function loadGlyphFromMMKV(codepoint: number): Glyph | undefined {
  const hexKey = getGlyphHexKey(codepoint);
  const glyphData = glyphStorage.getString(hexKey);
  return glyphData ? JSON.parse(glyphData) : undefined;
}

function loadFontFromMMKV(): Font | undefined {
  const metadata = loadFontMetadataFromMMKV();
  if (!metadata) return undefined;
  
  const font: Font = {
    headers: metadata.headers,
    props: new Map(metadata.props),
    propsComments: metadata.propsComments,
    glyphs: new Map()
  };
  
  glyphStorage.getAllKeys().forEach(hexKey => {
    const codepoint = parseInt(hexKey, 16); // Parse hex string back to number
    const glyph = loadGlyphFromMMKV(codepoint);
    if (glyph) {
      font.glyphs.set(codepoint, glyph);
    }
  });
  
  return font;
}

function loadNonSelectedFontsFromMMKV(): SerializableFont[] {
  const nonSelectedFonts: SerializableFont[] = [];
  nonSelectedFontsStorage.getAllKeys().forEach(fontname => {
    const text = nonSelectedFontsStorage.getString(fontname);
    if (text === undefined) throw new Error("If its a key it should have a value");
    const serializableFont = JSON.parse(text);
    nonSelectedFonts.push(serializableFont);
  })
  return nonSelectedFonts;
}

function switchFontInMMKV(newFont: Font | undefined): void {
  fontStorage.clearAll();
  glyphStorage.clearAll();
  
  if (newFont) {
    saveFontMetadataToMMKV(newFont);
    newFont.glyphs.forEach((glyph, codepoint) => {
      saveGlyphToMMKV(codepoint, glyph);
    });
  }
}

export const useFontStore = create<State & Actions>((set, get) => ({
  nonSelectedFonts: loadNonSelectedFontsFromMMKV(),
  font: loadFontFromMMKV(),
  selectedCodepoint: loadSelectedCodepointFromMMKV() ?? 0,
  addFont: (font: Font) => {
    if (nonSelectedFontsStorage.contains(font.headers.fontname)) {
      throw new Error("Importing two fonts with the same name isnt supported yet");
      // TODO: Append " (n)" to the font name or something like that
    }
    const serializableFont = font2serializable(font);
    nonSelectedFontsStorage.set(font.headers.fontname, JSON.stringify(serializableFont));
    set(prev => ({ nonSelectedFonts: [...prev.nonSelectedFonts, serializableFont] }));
  },
  deleteFont: (idx: number) => {
    if (idx < 0 || idx >= get().nonSelectedFonts.length) {
      throw new Error("Index out of range");
    }
    const serializableFont = get().nonSelectedFonts[idx];
    nonSelectedFontsStorage.remove(serializableFont.headers.fontname);
    set(prev => ({ nonSelectedFonts: prev.nonSelectedFonts.toSpliced(idx, 1) }));
  },
  setSelectedFontIdx: (idx: number | undefined) => {
    const prevFont = get().font;
    if (prevFont !== undefined) {
      // Save the previously selected font into nonSelectedFonts and persist it
      const idx = get().nonSelectedFonts
        .findIndex(f => f.headers.fontname === prevFont.headers.fontname);

      const serializablePrevFont = font2serializable(prevFont);

      set(state => ({
        nonSelectedFonts: state.nonSelectedFonts
          .toSpliced(idx, 1, serializablePrevFont),
      }));

      nonSelectedFontsStorage.set(
        serializablePrevFont.headers.fontname,
        JSON.stringify(serializablePrevFont),
      );
    }

    if (idx === undefined) {
      set({ font: undefined });
      switchFontInMMKV(undefined);
      return;
    }

    if (idx < 0 || idx >= get().nonSelectedFonts.length) {
      throw new Error("Index out of range");
    }

    const font = serializable2font(get().nonSelectedFonts[idx]);
    set({ font });

    switchFontInMMKV(font);
  },
  updateGlyph: (codepoint: number, glyph: Glyph) => {
    // Update state immediately
    set(state => {
      if (!state.font) return state;
      const updatedFont = { ...state.font };
      // Should recreate the map but if it has a lot of glyphs it would be slow
      updatedFont.glyphs.set(codepoint, glyph);
      return { font: updatedFont };
    });

    saveGlyphToMMKV(codepoint, glyph);
  },
  deleteGlyph: (codepoint: number) => {
    set(state => {
      if (!state.font) return state;
      const updatedFont = { ...state.font };
      // Should recreate the map but if it has a lot of glyphs it would be slow
      updatedFont.glyphs.delete(codepoint);
      return { font: updatedFont };
    });

    deleteGlyphFromMMKV(codepoint);
  },
  setSelectedCodepoint: (codepoint) => {
    set({ selectedCodepoint: codepoint });
    saveSelectedCodepointToMMKV(codepoint);
  },
}));
