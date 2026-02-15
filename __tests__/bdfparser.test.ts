import {
  Font,
  serializeToBDF,
  font2serializable,
  serializable2font,
  hexdata2bools,
  bools2hexdata,
} from "../lib/bdfparser/bdfparser";

describe("hexdata2bools", () => {

  it("converts simple hex row to booleans", () => {
    const result = hexdata2bools(["FF"], 8);
    expect(result).toEqual([[true, true, true, true, true, true, true, true]]);
  });

  it("converts single bit to boolean", () => {
    const result = hexdata2bools(["80"], 8);
    expect(result).toEqual([[true, false, false, false, false, false, false, false]]);
  });

  it("handles width smaller than byte", () => {
    const result = hexdata2bools(["FF"], 4);
    expect(result).toEqual([[true, true, true, true]]);
  });
  
  it("truncates bits from the right", () => {
    const result = hexdata2bools(["80"], 4);
    expect(result).toEqual([[true, false, false, false]]);
  });

  it("handles multiple rows", () => {
    const result = hexdata2bools(["FF", "00", "FF"], 8);
    expect(result).toEqual([
      [true, true, true, true, true, true, true, true],
      [false, false, false, false, false, false, false, false],
      [true, true, true, true, true, true, true, true],
    ]);
  });

  it("handles width spanning multiple bytes", () => {
    const result = hexdata2bools(["FFFF"], 16);
    expect(result).toEqual([
      Array(16).fill(true),
    ]);
  });
});

describe("bools2hexdata", () => {

  it("converts all true bits to FF", () => {
    const result = bools2hexdata([[true, true, true, true, true, true, true, true]]);
    expect(result).toEqual(["FF"]);
  });

  it("converts single bit correctly", () => {
    const result = bools2hexdata([[true, false, false, false, false, false, false, false]]);
    expect(result).toEqual(["80"]);
  });

  it("convert to hex and pads right to width 8", () => {
    const result = bools2hexdata([[true, true, true, true]]);
    expect(result).toEqual(["F0"]);
  });

  it("handles multiple rows", () => {
    const result = bools2hexdata([
      [true, true, true, true, true, true, true, true],
      [false, false, false, false, false, false, false, false],
      [true, true, true, true, true, true, true, true],
    ]);
    expect(result).toEqual(["FF", "00", "FF"]);
  });
  
  it("handles width spanning multiple bytes", () => {
    const result = bools2hexdata([Array(16).fill(true)]);
    expect(result).toEqual(["FFFF"]);
  });
});

describe("hexdata2bools and bools2hexdata roundtrip", () => {

  it("roundtrips simple bitmap", () => {
    const original = ["FF", "00", "AA"];
    const bools = hexdata2bools(original, 8);
    const result = bools2hexdata(bools);
    expect(result).toEqual(original);
  });

  it("roundtrips checkerboard pattern", () => {
    const original = ["AA", "55", "AA", "55"];
    const bools = hexdata2bools(original, 8);
    const result = bools2hexdata(bools);
    expect(result).toEqual(original);
  });
});

describe("font2serializable and serializable2font", () => {
  it("converts font to serializable and back", () => {
    const font: Font = {
      headers: {
        bdfversion: 2.1,
        fontname: "TestFont",
        pointsize: 12,
        xres: 75,
        yres: 75,
        fbbx: 8,
        fbby: 16,
        fbbxoff: 0,
        fbbyoff: 0,
      },
      props: new Map([["foo", "bar"], ["baz", null]]),
      propsComments: ["Comment 1", "Comment 2"],
      glyphs: new Map([
        [65, {
          glyphname: "A",
          codepoint: 65,
          bbw: 8,
          bbh: 16,
          bbxoff: 0,
          bbyoff: 0,
          bitmap: Array(16).fill(Array(8).fill(false)),
        }],
      ]),
    };

    const serializable = font2serializable(font);
    expect(serializable.headers).toEqual(font.headers);
    expect(serializable.props).toEqual(font.props.entries().toArray());
    expect(serializable.propsComments).toEqual(font.propsComments);
    expect(serializable.glyphs).toEqual(font.glyphs.entries().toArray());

    const restored = serializable2font(serializable);
    expect(restored.headers).toEqual(font.headers);
    expect(restored.props).toEqual(font.props);
    expect(restored.propsComments).toEqual(font.propsComments);
    expect(restored.glyphs).toEqual(font.glyphs);
  });
});

describe("serializeToBDF", () => {
  it("serializes minimal font", () => {
    const font: Font = {
      headers: {
        bdfversion: 2.1,
        fontname: "Minimal",
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
      glyphs: new Map(),
    };

    const result = serializeToBDF(font);
    expect(result).toContain("STARTFONT 2.1");
    expect(result).toContain("FONT Minimal");
    expect(result).toContain("SIZE 12 75 75");
    expect(result).toContain("FONTBOUNDINGBOX 8 16 0 0");
    expect(result).toContain("CHARS 0");
    expect(result).toContain("ENDFONT");
  });

  it("serializes font with glyphs", () => {
    const font: Font = {
      headers: {
        bdfversion: 2.1,
        fontname: "Test",
        pointsize: 12,
        xres: 75,
        yres: 75,
        fbbx: 8,
        fbby: 16,
        fbbxoff: 0,
        fbbyoff: 0,
        dwx0: 8,
        dwy0: 0,
      },
      props: new Map([["pixel_size", "12"]]),
      propsComments: [],
      glyphs: new Map([
        [65, {
          glyphname: "A",
          codepoint: 65,
          bbw: 8,
          bbh: 16,
          bbxoff: 0,
          bbyoff: 0,
          dwx0: 8,
          dwy0: 0,
          bitmap: [
            [false, false, true, true, false, false, false, false],
            [false, true, false, false, true, false, false, false],
          ],
        }],
      ]),
    };

    const result = serializeToBDF(font);
    expect(result).toContain("STARTCHAR A");
    expect(result).toContain("ENCODING 65");
    expect(result).toContain("BBX 8 16 0 0");
    expect(result).toContain("BITMAP");
    expect(result).toContain("ENDCHAR");
  });
});
