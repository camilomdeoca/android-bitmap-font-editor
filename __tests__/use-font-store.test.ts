import { Font, font2serializable, Glyph } from "../lib/bdfparser/bdfparser";

const mockStorage = new Map<string, Map<string, string | number>>();

jest.mock("react-native-mmkv", () => {
  return {
    createMMKV: jest.fn(({ id }: { id: string }) => {
      if (!mockStorage.has(id)) {
        mockStorage.set(id, new Map<string, string | number>());
      }

      let thisIdMockStorage = mockStorage.get(id);
      if (thisIdMockStorage === undefined) {
        throw new Error("Can't be undefined because its set above if it doesn't exist");
      }
      
      return {
        getString: (key: string) => thisIdMockStorage.get(key) as string | undefined,
        getNumber: (key: string) => thisIdMockStorage.get(key) as number | undefined,
        set: (key: string, value: string | number) => {
          thisIdMockStorage.set(key, value);
        },
        remove: (key: string) => {
          thisIdMockStorage.delete(key);
        },
        getAllKeys: () => Array.from(thisIdMockStorage.keys()),
        contains: (key: string) => thisIdMockStorage.has(key),
        clearAll: () => thisIdMockStorage.clear(),
      };
    }),
    deleteMMKV: jest.fn((id: string) => mockStorage.delete(id)),
  };
});

describe("useFontStore", () => {
  let useFontStore: typeof import("../hooks/use-font-store").useFontStore;
  beforeEach(async () => {
    jest.resetModules();
    mockStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../hooks/use-font-store");
    useFontStore = mod.useFontStore;
  });

  const createTestFont = (name: string): Font => ({
    headers: {
      bdfversion: 2.1,
      fontname: name,
      pointsize: 12,
      xres: 75,
      yres: 75,
      fbbx: 8,
      fbby: 16,
      fbbxoff: 0,
      fbbyoff: 0,
    },
    props: new Map(),
    propsComments: [],
    glyphs: new Map([
      [65, {
        glyphname: "A",
        codepoint: 65,
        bbw: 8,
        bbh: 16,
        bbxoff: 0,
        bbyoff: 0,
        bitmap: [],
      }],
    ]),
  });

  describe("addFont", () => {
    it("adds a font to nonSelectedFonts", () => {
      const font = createTestFont("TestFont");
      useFontStore.getState().addFont(font);
      expect(useFontStore.getState().nonSelectedFonts).toHaveLength(1);
      expect(useFontStore.getState().nonSelectedFonts[0].headers.fontname).toBe("TestFont");
    });

    it("throws when adding duplicate font name", () => {
      const font = createTestFont("DuplicateFont");
      useFontStore.getState().addFont(font);
      expect(() => useFontStore.getState().addFont(font)).toThrow(
        "Importing two fonts with the same name isnt supported yet"
      );
    });
  });

  describe("deleteFont", () => {
    it("removes a font from nonSelectedFonts", () => {
      const font = createTestFont("FontToDelete");
      useFontStore.getState().addFont(font);
      expect(useFontStore.getState().nonSelectedFonts).toHaveLength(1);
      useFontStore.getState().deleteFont(0);
      expect(useFontStore.getState().nonSelectedFonts).toHaveLength(0);
    });

    it("throws when index out of range", () => {
      expect(() => useFontStore.getState().deleteFont(99)).toThrow("Index out of range");
    });
  });

  describe("setSelectedFontIdx", () => {
    it("sets the current font", () => {
      const font = createTestFont("SelectableFont");
      useFontStore.getState().addFont(font);
      useFontStore.getState().setSelectedFontIdx(0);
      expect(useFontStore.getState().font?.headers.fontname).toBe("SelectableFont");
    });

    it("clears current font when passed undefined", () => {
      const font = createTestFont("AnotherFont");
      useFontStore.getState().addFont(font);
      useFontStore.getState().setSelectedFontIdx(0);
      useFontStore.getState().setSelectedFontIdx(undefined);
      expect(useFontStore.getState().font).toBeUndefined();
    });

    it("throws when index out of range", () => {
      expect(() => useFontStore.getState().setSelectedFontIdx(99)).toThrow("Index out of range");
    });
  });

  describe("updateGlyph", () => {
    it("updates a glyph in the current font", () => {
      const font = createTestFont("GlyphFont");
      useFontStore.getState().addFont(font);
      useFontStore.getState().setSelectedFontIdx(0);

      const newGlyph: Glyph = {
        glyphname: "B",
        codepoint: 66,
        bbw: 8,
        bbh: 16,
        bbxoff: 0,
        bbyoff: 0,
        bitmap: [],
      };

      useFontStore.getState().updateGlyph(66, newGlyph);
      const updatedFont = useFontStore.getState().font;
      expect(updatedFont?.glyphs.get(66)).toEqual(newGlyph);
    });

    it("does nothing when no font is selected", () => {
      const newGlyph: Glyph = {
        glyphname: "B",
        codepoint: 66,
        bbw: 8,
        bbh: 16,
        bbxoff: 0,
        bbyoff: 0,
        bitmap: [],
      };

      useFontStore.getState().updateGlyph(66, newGlyph);
      expect(useFontStore.getState().font).toBeUndefined();
    });
  });

  describe("deleteGlyph", () => {
    it("deletes a glyph from the current font", () => {
      const font = createTestFont("DeleteGlyphFont");
      useFontStore.getState().addFont(font);
      useFontStore.getState().setSelectedFontIdx(0);

      useFontStore.getState().deleteGlyph(65);
      const updatedFont = useFontStore.getState().font;
      expect(updatedFont?.glyphs.has(65)).toBe(false);
    });

    it("does nothing when no font is selected", () => {
      useFontStore.getState().deleteGlyph(65);
      expect(useFontStore.getState().font).toBeUndefined();
    });
  });

  describe("setSelectedCodepoint", () => {
    it("sets the selected codepoint", () => {
      useFontStore.getState().setSelectedCodepoint(65);
      expect(useFontStore.getState().selectedCodepoint).toBe(65);
    });
  });

  describe("MMKV persistence", () => {
    it("loads data from MMKV on module reload", async () => { 
      jest.isolateModules(() => {
        const font = createTestFont("TestFont");
        useFontStore.getState().addFont(font);
        useFontStore.getState().setSelectedFontIdx(0);
        useFontStore.getState().setSelectedCodepoint(65);

        jest.resetModules();

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        useFontStore = require("../hooks/use-font-store").useFontStore;

        expect(useFontStore.getState().nonSelectedFonts).toHaveLength(1);
        expect(useFontStore.getState().nonSelectedFonts[0]).toEqual(font2serializable(font));
        expect(useFontStore.getState().font).toEqual(font);
        expect(useFontStore.getState().selectedCodepoint).toBe(65);
      });
    });
  });
});
