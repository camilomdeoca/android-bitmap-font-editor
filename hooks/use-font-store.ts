import { Font, font2serializable, Glyph, serializable2font, SerializableFont } from "@/lib/bdfparser/bdfparser";
import { create } from "zustand";
import { createMMKV, MMKV } from 'react-native-mmkv';

const FONT_METADATA_KEY = 'metadata';
const SELECTED_CODEPOINT_KEY = 'selected-codepoint';

const nonSelectedFontsStorage = createMMKV({ id: 'non-selected-fonts' });

// Selected font storage
const fontStorage = createMMKV({ id: 'current-font' });
const glyphStorage = createMMKV({ id: 'current-font-glyphs' });
const undoStorage = createMMKV({ id: "current-font-undo" });
const redoStorage = createMMKV({ id: "current-font-redo" });

interface FontMetadata {
  headers: any;
  props: [string, string | null][];
  propsComments: string[];
}

type EditOperation = {
  codepoint: number,
  newValue: boolean,
  affected: [number, number][],
};

type State = {
  nonSelectedFonts: SerializableFont[],
  font: Font | undefined,
  selectedCodepoint: number,

  undoStack: EditOperation[],
  redoStack: EditOperation[],

  ongoingOperation: EditOperation | undefined,
};

type Actions = {
  addFont: (font: Font) => void,
  deleteFont: (idx: number) => void,
  setSelectedFontIdx: (idx: number | undefined) => void,
  updateGlyph: (codepoint: number, glyph: Glyph) => void,
  deleteGlyph: (codepoint: number) => void,
  setSelectedCodepoint: (codepoint: number) => void,

  beginOperation: (codepoint: number, newValue: boolean) => void,
  endOperation: () => void,

  undo: () => void,
  redo: () => void,
};

function getBitmapChanges(
  oldBitmap: boolean[][],
  newBitmap: boolean[][],
): [number, number][] {
  const result: [number, number][] = [];
  if (oldBitmap.length !== newBitmap.length)
    throw new Error("Height changed");
  if (oldBitmap[0].length !== newBitmap[0].length)
    throw new Error("Width changed");
  for (let y = 0; y < oldBitmap.length; y++) {
    for (let x = 0; x < oldBitmap[y].length; x++) {
      if (oldBitmap[y][x] !== newBitmap[y][x]) {
        result.push([x, y]);
      }
    }
  }
  return result;
}

function undoChange(glyph: Glyph, change: EditOperation) {
  for (const [x, y] of change.affected) {
    glyph.bitmap[y][x] = !change.newValue;
  }
}

function redoChange(glyph: Glyph, change: EditOperation) {
  for (const [x, y] of change.affected) {
    glyph.bitmap[y][x] = change.newValue;
  }
}

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

function loadChangesStackFromMMKV(storage: MMKV): EditOperation[] {
  const keys = storage.getAllKeys();
  const result = Array(keys.length);

  for (const key of keys) {
    const operation = storage.getString(key);
    if (operation === undefined) throw new Error("If its in getAllKeys() it should exist");
    const idx = parseInt(key);
    if (isNaN(idx) || !isFinite(idx) || idx < 0 || idx >= result.length)
      throw new Error("Invalid index");
    result[idx] = JSON.parse(operation);
  }

  return result;
}

export const useFontStore = create<State & Actions>((set, get) => ({
  nonSelectedFonts: loadNonSelectedFontsFromMMKV(),
  font: loadFontFromMMKV(),
  selectedCodepoint: loadSelectedCodepointFromMMKV() ?? 0,
  undoStack: loadChangesStackFromMMKV(undoStorage),
  redoStack: loadChangesStackFromMMKV(redoStorage),
  ongoingOperation: undefined,
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

    // Clear undo stack
    undoStorage.clearAll();
    redoStorage.clearAll();
    set({ undoStack: [], redoStack: [], ongoingOperation: undefined });
  },
  updateGlyph: (codepoint: number, glyph: Glyph) => {
    // Update state immediately
    set(state => {
      if (!state.font) return state;

      const oldGlyph = state.font.glyphs.get(codepoint);
      if (oldGlyph) {
        const changes = getBitmapChanges(oldGlyph.bitmap, glyph.bitmap);
        if (changes.length !== 0) {
          if (changes.length !== 1) throw new Error("Expected only 1 pixel change");

          set(state => {
            if (!state.ongoingOperation)
              throw new Error("Glyph change without operation started");

            return {ongoingOperation: {
              ...state.ongoingOperation,
              affected: [...state.ongoingOperation.affected, ...changes],
            }};
          })
        }
      } else {
        // The glyph was just added
        // TODO: Add a created glyph operation
      }

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

  beginOperation: (codepoint: number, newValue: boolean) => set({
    ongoingOperation: {
      codepoint,
      newValue,
      affected: [],
    },
  }),
  endOperation: () => {
    // 1. Save `ongoingOperation` in undoStack
    set(state => {
      if (!state.ongoingOperation)
        throw new Error("An operation needs to be started to be ended");
      return {
        undoStack: [...state.undoStack, state.ongoingOperation],
        // Clear redo stack to not reapply changes
        redoStack: [],
      };
    })
    // console.log(get().ongoingOperation);

    // 2. Persist to MMKV
    undoStorage.set(`${get().undoStack.length-1}`, JSON.stringify(get().ongoingOperation));
    
    // Clear redo storages because those changes would be applied to a different glyph
    redoStorage.clearAll();

    // 3. Set `ongoingOperation` to undefined
    set({ ongoingOperation: undefined });
  },
  undo: () => {
    if (get().undoStack.length === 0) return;

    // 1. Invert the change
    set(state => {
      const change = state.undoStack[state.undoStack.length-1];
      if (!state.font) return state;
      const updatedFont = { ...state.font };
      // Should recreate the map but if it has a lot of glyphs it would be slow
      const oldGlyph = state.font.glyphs.get(change.codepoint);
      if (!oldGlyph) throw new Error("Glyph doesn't exist");
      const newGlyph = {
        ...oldGlyph,
        bitmap: oldGlyph.bitmap.map(row => [...row]),
      };
      undoChange(newGlyph, change);
      updatedFont.glyphs.set(change.codepoint, newGlyph);
      return { font: updatedFont, selectedCodepoint: change.codepoint };
    });

    // 2. Move top of the undo stack to redo stack
    set(state => {
      const newRedoStack = [...state.redoStack, state.undoStack[state.undoStack.length-1]];
      const newUndoStack = state.undoStack.toSpliced(state.undoStack.length-1, 1);

      return {
        redoStack: newRedoStack,
        undoStack: newUndoStack,
      };
    });

    // 3. Do the same in MMKV storages
    redoStorage.set(`${get().redoStack.length-1}`, JSON.stringify(get().redoStack[get().redoStack.length-1]))
    undoStorage.remove(`${get().undoStack.length}`);
  },
  redo: () => {
    if (get().redoStack.length === 0) return;
    
    // 1. Reapply the change
    set(state => {
      const change = state.redoStack[state.redoStack.length-1];
      if (!state.font) return state;
      const updatedFont = { ...state.font };
      // Should recreate the map but if it has a lot of glyphs it would be slow
      const oldGlyph = state.font.glyphs.get(change.codepoint);
      if (!oldGlyph) throw new Error("Glyph doesn't exist");
      const newGlyph = {
        ...oldGlyph,
        bitmap: oldGlyph.bitmap.map(row => [...row]),
      };
      redoChange(newGlyph, change);
      updatedFont.glyphs.set(change.codepoint, newGlyph);
      return { font: updatedFont, selectedCodepoint: change.codepoint };
    });

    // 2. Move top of the redo stack to undo stack
    set(state => {
      const newUndoStack = [...state.undoStack, state.redoStack[state.redoStack.length-1]];
      const newRedoStack = state.redoStack.toSpliced(state.redoStack.length-1, 1);

      return {
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    });

    // 3. Do the same in MMKV storages
    undoStorage.set(`${get().undoStack.length-1}`, JSON.stringify(get().undoStack[get().undoStack.length-1]))
    redoStorage.remove(`${get().redoStack.length}`);
  },
}));
