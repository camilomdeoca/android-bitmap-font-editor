import { Font, Glyph } from "@/lib/bdfparser/bdfparser";
import { create } from "zustand";
import { createMMKV } from 'react-native-mmkv';

const FONT_METADATA_KEY = 'metadata';
const SELECTED_CODEPOINT_KEY = 'selected-codepoint';

let fontStorage = createMMKV({ id: 'current-font' });
let glyphStorage = createMMKV({ id: 'current-font-glyphs' });

interface FontMetadata {
  headers: any;
  props: [string, string | null][];
  propsComments: string[];
}

type State = {
  font: Font | undefined,
  selectedCodepoint: number,
};

type Actions = {
  setFont: (font?: Font) => void,
  updateGlyph: (codepoint: number, glyph: Glyph) => void,
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
  font: loadFontFromMMKV(),
  selectedCodepoint: loadSelectedCodepointFromMMKV() ?? 0,
  setFont: (font = undefined) => {
    set({ font });
    switchFontInMMKV(font);
  },
  updateGlyph: (codepoint: number, glyph: Glyph) => {
    // Update state immediately
    set(state => {
      if (!state.font) return state;
      const updatedFont = { ...state.font };
      updatedFont.glyphs.set(codepoint, glyph);
      return { font: updatedFont };
    });
    
    saveGlyphToMMKV(codepoint, glyph);
  },
  setSelectedCodepoint: (codepoint = 0) => {
    set({ selectedCodepoint: codepoint });
    saveSelectedCodepointToMMKV(codepoint);
  },
}));
