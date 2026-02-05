import { Font, Glyph } from "@/lib/bdfparser/bdfparser";
import { create } from "zustand";
import { createMMKV } from 'react-native-mmkv';

const FONT_METADATA_KEY = 'metadata';

let fontStorage = createMMKV({ id: 'current-font' });
let glyphStorage = createMMKV({ id: 'current-font-glyphs' });

interface FontMetadata {
  headers: any;
  props: [string, string | null][];
  propsComments: string[];
}

type State = {
  font: Font | undefined,
};

type Actions = {
  setFont: (font?: Font) => void,
  updateCharacter: (codepoint: number, glyph: Glyph) => void,
};

function getGlyphHexKey(codepoint: number): string {
  return codepoint.toString(16);
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
  setFont: (font = undefined) => {
    set({ font });
    switchFontInMMKV(font);
  },
  updateCharacter: (codepoint: number, glyph: Glyph) => {
    set(state => {
      if (!state.font) return state;
      const updatedFont = { ...state.font };
      updatedFont.glyphs.set(codepoint, glyph);
      return { font: updatedFont };
    });
    
    saveGlyphToMMKV(codepoint, glyph);
  },
}));
