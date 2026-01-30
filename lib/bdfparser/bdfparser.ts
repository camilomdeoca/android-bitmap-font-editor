/**
* Adapted from bdfparser-js
* https://github.com/tomchen/bdfparser-js
*
* Copyright (c) 2017-2021 Tom Chen (tomchen.org)
* Licensed under the MIT License.
*
* Original source:
* https://github.com/tomchen/bdfparser-js/blob/main/src/bdfparser.ts
*/
export type Headers = {
  bdfversion: number
  fontname: string
  pointsize: number
  xres: number
  yres: number
  fbbx: number
  fbby: number
  fbbxoff: number
  fbbyoff: number
  swx0?: number
  swy0?: number
  dwx0?: number
  dwy0?: number
  swx1?: number
  swy1?: number
  dwx1?: number
  dwy1?: number
  vvectorx?: number
  vvectory?: number
  metricsset?: number
  contentversion?: number
  comment?: string[]
}

export type Glyph = {
  glyphname: string,
  codepoint: number,
  bbw: number,
  bbh: number,
  bbxoff: number,
  bbyoff: number,
  swx0?: number,
  swy0?: number,
  dwx0?: number,
  dwy0?: number,
  swx1?: number,
  swy1?: number,
  dwx1?: number,
  dwy1?: number,
  vvectorx?: number,
  vvectory?: number,
  bitmap: boolean[][],
}

export type CodepointRangeType = number | [number, number] | [number, number][]
export type OrderType = -1 | 0 | 1 | 2
export type GlyphDrawModeType = -1 | 0 | 1 | 2

const PATTERN_VVECTOR_DELIMITER = '[\\s]+'

export type Font = {
  headers: Headers,
  props: Map<string, string | null>,
  propsComments: string[],
  glyphs: Map<number, Glyph>,
};

type ParseCtx = {
  glyph_count_to_check: number | null,
  curline_startchar: string | null,
  curline_chars: string | null,
  lines: AsyncIterableIterator<string>,
};


/**
 * Load the BDF font file (file line async iterator).
 *
 * @param filelines - Asynchronous iterable iterator containing each line in string text from the font file
 *
 * @returns The `Font` object
 */
export async function load_font(
  filelines: AsyncIterableIterator<string>
): Promise<Font> {
  const parseCtx: ParseCtx = {
    glyph_count_to_check: null,
    curline_startchar: null,
    curline_chars: null,
    lines: filelines,
  };
  const font: Partial<Font> = {};
  try {
    await __parse_headers(font, parseCtx);
  } finally {
    // @ts-ignore
    if (typeof Deno !== 'undefined') {
      // Deno needs to run to the end and close the file
      if (parseCtx.lines !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of parseCtx.lines) {
        }
      }
    }
  }
  // TODO: Assert this cast
  return font as Font;
}

async function __parse_headers(font: Partial<Font>, parseCtx: ParseCtx): Promise<void> {
  const partialHeaders: Partial<Headers> = {};
  while (1) {
    const line: string = (await parseCtx.lines.next())?.value;
    const kvlist = line.split(/ (.+)/, 2);
    const l = kvlist.length;
    let nlist: string[];
    if (l === 2) {
      const key = kvlist[0];
      const value = kvlist[1].trim();
      switch (key) {
        case 'STARTFONT':
          partialHeaders.bdfversion = parseFloat(value);
          break;
        case 'FONT':
          partialHeaders.fontname = value;
          break;
        case 'SIZE':
          nlist = value.split(' ');
          partialHeaders.pointsize = parseInt(nlist[0], 10);
          partialHeaders.xres = parseInt(nlist[1], 10);
          partialHeaders.yres = parseInt(nlist[2], 10);
          break;
        case 'FONTBOUNDINGBOX':
          nlist = value.split(' ')
          partialHeaders.fbbx = parseInt(nlist[0], 10);
          partialHeaders.fbby = parseInt(nlist[1], 10);
          partialHeaders.fbbxoff = parseInt(nlist[2], 10);
          partialHeaders.fbbyoff = parseInt(nlist[3], 10);
          break;
        case 'STARTPROPERTIES':
          // TODO: Verify this cast
          font.headers = partialHeaders as Headers;
          await __parse_props(font, parseCtx);
          return;
        case 'COMMENT':
          if (
            !('comment' in partialHeaders) ||
            !Array.isArray(partialHeaders.comment)
          ) {
            partialHeaders.comment = [];
          }
          partialHeaders.comment.push(
            value.replace(/^[\s"'\t\r\n]+|[\s"'\t\r\n]+$/g, '')
          );
          break;
        case 'SWIDTH':
          nlist = value.split(' ');
          partialHeaders.swx0 = parseInt(nlist[0], 10);
          partialHeaders.swy0 = parseInt(nlist[1], 10);
          break;
        case 'DWIDTH':
          nlist = value.split(' ');
          partialHeaders.dwx0 = parseInt(nlist[0], 10);
          partialHeaders.dwy0 = parseInt(nlist[1], 10);
          break;
        case 'SWIDTH1':
          nlist = value.split(' ');
          partialHeaders.swx1 = parseInt(nlist[0], 10);
          partialHeaders.swy1 = parseInt(nlist[1], 10);
          break;
        case 'DWIDTH1':
          nlist = value.split(' ');
          partialHeaders.dwx1 = parseInt(nlist[0], 10);
          partialHeaders.dwy1 = parseInt(nlist[1], 10);
          break;
        case 'VVECTOR':
          nlist = PATTERN_VVECTOR_DELIMITER.split(value);
          partialHeaders.vvectorx = parseInt(nlist[0], 10);
          partialHeaders.vvectory = parseInt(nlist[1], 10);
          break;
        case 'METRICSSET':
          partialHeaders.metricsset = parseInt(value, 10);
          break;
        case 'CONTENTVERSION':
          partialHeaders.contentversion = parseInt(value, 10);
          break;
        case 'CHARS':
          console.warn(
            "It looks like the font does not have property block beginning with 'STARTPROPERTIES' keyword"
          )
          // TODO: Verify this cast
          font.headers = partialHeaders as Headers;
          parseCtx.curline_chars = line;
          await __parse_glyph_count(font, parseCtx);
          return;
        case 'STARTCHAR':
          console.warn(
            "It looks like the font does not have property block beginning with 'STARTPROPERTIES' keyword"
          );
          console.warn("Cannot find 'CHARS' line");
          // TODO: Verify this cast
          font.headers = partialHeaders as Headers;
          parseCtx.curline_startchar = line;
          await __prepare_glyphs(font, parseCtx);
          return;
      }
    }
    if (l === 1 && kvlist[0].trim() === 'ENDFONT') {
      console.warn(
        "It looks like the font does not have property block beginning with 'STARTPROPERTIES' keyword"
      )
      console.warn('This font does not have any glyphs')
      return;
    }
  }
}

async function __parse_props(font: Partial<Font>, parseCtx: ParseCtx): Promise<void> {
  font.propsComments = [];
  font.props = new Map();
  while (1) {
    const line: string = (await parseCtx.lines.next())?.value;
    const kvlist = line.split(/ (.+)/, 2);
    const l = kvlist.length;
    if (l === 2) {
      const key = kvlist[0];
      const value = kvlist[1].replace(/^[\s"'\t\r\n]+|[\s"'\t\r\n]+$/g, '');
      if (key === 'COMMENT') {
        font.propsComments.push(
          value.replace(/^[\s"'\t\r\n]+|[\s"'\t\r\n]+$/g, '')
        )
      } else {
        font.props.set(key.toLowerCase(), value);
      }
    } else {
      if (l === 1) {
        const key = kvlist[0].trim();
        if (key === 'ENDPROPERTIES') {
          await __parse_glyph_count(font, parseCtx);
          return;
        }
        if (key === 'ENDFONT') {
          console.warn('This font does not have any glyphs');
          return;
        } else {
          if (font.props === undefined) font.props = new Map();
          font.props.set(key, null);
        }
      }
    }
  }
}

async function __parse_glyph_count(font: Partial<Font>, parseCtx: ParseCtx): Promise<void> {
  let line: string;
  if (parseCtx.curline_chars === null) {
    line = (await parseCtx.lines.next())?.value;
  } else {
    line = parseCtx.curline_chars;
    parseCtx.curline_chars = null;
  }
  if (line.trim() === 'ENDFONT') {
    console.warn('This font does not have any glyphs');
    return;
  }
  const kvlist = line.split(/ (.+)/, 2);
  if (kvlist[0] === 'CHARS') {
    parseCtx.glyph_count_to_check = parseInt(kvlist[1].trim(), 10);
  } else {
    parseCtx.curline_startchar = line;
    console.warn("Cannot find 'CHARS' line next to 'ENDPROPERTIES' line");
  }
  await __prepare_glyphs(font, parseCtx);
}

function hexdata2bools(hexdata: string[], width: number): boolean[][] {
  return hexdata.map(rowInHex => {
    let bits = [];
    
    let rowInt = BigInt("0x" + rowInHex);
    while (rowInt > 0n) {
      bits.push((rowInt & 1n) === 1n);
      rowInt >>= 1n;
    }

    // pad left with zeros to multiple of 8
    // (left of number written left to right not like they are arranged in the bits array)
    bits.push(...Array<boolean>(rowInHex.length*4 - bits.length).fill(false));

    // We were pushing to the end so the most significant significant bit is in the end
    bits.reverse();

    // Remove extra from right
    bits.splice(width);

    return bits;
  });
}

function bools2hexdata(bitmap: boolean[][]): string[] {
  return bitmap.map(bits => {
    let n = 0n;
    for (const bit of bits) {
      n <<= 1n;
      if (bit) n |= 1n;
    }

    // pad with zeros on the right
    const remainder = bits.length % 8;
    if (remainder !== 0) {
      n <<= 8n - BigInt(remainder);
    }

    return n
      .toString(16)
      .padStart(Math.floor((bits.length + 7) / 8) * 2, "0") // Has to be left padded with zeros
      .toUpperCase(); // All fonts use uppercase, i dont know if its mandatory
  });
}

async function __prepare_glyphs(font: Partial<Font>, parseCtx: ParseCtx): Promise<void> {
  font.glyphs = new Map();
  let glyphCodepoint = 0;
  let partialGlyph: Partial<Glyph> = {}; // TODO: remove initial value
  let glyphBitmap: string[] = [] // TODO: remove initial value
  let glyphBitmapIsOn = false
  let glyphEnd = false
  while (1) {
    let line: string
    if (parseCtx.curline_startchar === null) {
      line = (await parseCtx.lines.next())?.value
    } else {
      line = parseCtx.curline_startchar
      parseCtx.curline_startchar = null
    }
    if (line === undefined || line === null) {
      console.warn("This font does not have 'ENDFONT' keyword")
      __prepare_glyphs_after(font, parseCtx)
      return
    }
    const kvlist = line.split(/ (.+)/, 2)
    const l = kvlist.length
    if (l === 2) {
      const key = kvlist[0]
      const value = kvlist[1].trim()
      let nlist: string[]
      switch (key) {
        case 'STARTCHAR':
          partialGlyph = {};
          partialGlyph.glyphname = value;
          glyphEnd = false;
          break;
        case 'ENCODING':
          glyphCodepoint = parseInt(value, 10);
          partialGlyph.codepoint = glyphCodepoint;
          break;
        case 'BBX':
          nlist = value.split(' ');
          partialGlyph.bbw = parseInt(nlist[0], 10);
          partialGlyph.bbh = parseInt(nlist[1], 10);
          partialGlyph.bbxoff = parseInt(nlist[2], 10);
          partialGlyph.bbyoff = parseInt(nlist[3], 10);
          break;
        case 'SWIDTH':
          nlist = value.split(' ');
          partialGlyph.swx0 = parseInt(nlist[0], 10);
          partialGlyph.swy0 = parseInt(nlist[1], 10);
          break;
        case 'DWIDTH':
          nlist = value.split(' ');
          partialGlyph.dwx0 = parseInt(nlist[0], 10);
          partialGlyph.dwy0 = parseInt(nlist[1], 10);
          break;
        case 'SWIDTH1':
          nlist = value.split(' ');
          partialGlyph.swx1 = parseInt(nlist[0], 10);
          partialGlyph.swy1 = parseInt(nlist[1], 10);
          break;
        case 'DWIDTH1':
          nlist = value.split(' ');
          partialGlyph.dwx1 = parseInt(nlist[0], 10);
          partialGlyph.dwy1 = parseInt(nlist[1], 10);
          break;
        case 'VVECTOR':
          nlist = PATTERN_VVECTOR_DELIMITER.split(value);
          partialGlyph.vvectorx = parseInt(nlist[0], 10);
          partialGlyph.vvectory = parseInt(nlist[1], 10);
          break;
      }
    } else {
      if (l === 1) {
        const key = kvlist[0].trim();
        switch (key) {
          case 'BITMAP':
            glyphBitmap = [];
            glyphBitmapIsOn = true;
            break;
          case 'ENDCHAR':
            glyphBitmapIsOn = false;
            if (!partialGlyph.bbw) throw new Error("Glyph width should be already defined.");
            partialGlyph.bitmap = hexdata2bools(glyphBitmap, partialGlyph.bbw);
            // TODO: verify every required field of partialGlyph
            font.glyphs.set(glyphCodepoint, partialGlyph as Glyph);
            glyphEnd = true;
            break;
          case 'ENDFONT':
            if (glyphEnd) {
              __prepare_glyphs_after(font, parseCtx);
              return;
            }
          default:
            if (glyphBitmapIsOn) {
              glyphBitmap.push(key);
            }
            break;
        }
      }
    }
  }
}

function __prepare_glyphs_after(font: Partial<Font>, parseCtx: ParseCtx): void {
  if (!font.glyphs) throw new Error("Glyphs map should be defined already");
  const l = font.glyphs.size;
  if (parseCtx.glyph_count_to_check !== l) {
    if (parseCtx.glyph_count_to_check === null) {
      console.warn("The glyph count next to 'CHARS' keyword does not exist")
    } else {
      console.warn(
        `The glyph count next to 'CHARS' keyword is ${parseCtx.glyph_count_to_check.toString()}, which does not match the actual glyph count ${l.toString()}`
      )
    }
  }
}

/**
 * Serializes the Font into a BDF file.
 *
 * @param font  - Font with character
 *
 * @returns String containing the font encoded as BDF
 */
export function serializeToBDF(font: Font): string {
  if (!font.headers) {
    throw new Error('Font has no headers')
  }

  const h = font.headers
  const lines: string[] = []

  // ---- Headers ----
  lines.push(`STARTFONT ${h.bdfversion}`)
  lines.push(`FONT ${h.fontname}`)
  lines.push(`SIZE ${h.pointsize} ${h.xres} ${h.yres}`)
  lines.push(`FONTBOUNDINGBOX ${h.fbbx} ${h.fbby} ${h.fbbxoff} ${h.fbbyoff}`)

  if (h.swx0 !== undefined && h.swy0 !== undefined)
    lines.push(`SWIDTH ${h.swx0} ${h.swy0}`)
  if (h.dwx0 !== undefined && h.dwy0 !== undefined)
    lines.push(`DWIDTH ${h.dwx0} ${h.dwy0}`)
  if (h.swx1 !== undefined && h.swy1 !== undefined)
    lines.push(`SWIDTH1 ${h.swx1} ${h.swy1}`)
  if (h.dwx1 !== undefined && h.dwy1 !== undefined)
    lines.push(`DWIDTH1 ${h.dwx1} ${h.dwy1}`)
  if (h.vvectorx !== undefined && h.vvectory !== undefined)
    lines.push(`VVECTOR ${h.vvectorx} ${h.vvectory}`)

  if (h.metricsset !== undefined) lines.push(`METRICSSET ${h.metricsset}`)
  if (h.contentversion !== undefined)
    lines.push(`CONTENTVERSION ${h.contentversion}`)

  if (h.comment?.length) {
    for (const c of h.comment) lines.push(`COMMENT "${c}"`)
  }

  // ---- Properties ----
  lines.push(`STARTPROPERTIES ${Object.keys(font.props).length}`)

  const integerProperties = new Set([
    'pixel_size',
    'point_size',
    'resolution_x',
    'resolution_y',
    'average_width',
    'underline_position',
    'underline_thickness',
    'cap_height',
    'x_height',
    'font_ascent',
    'font_descent',
    'default_char',
  ])

  for (const [k, v] of Object.entries(font.props)) {
    if (k === 'comment' && Array.isArray(v)) {
      for (const c of v) lines.push(`COMMENT "${c}"`)
    } else if (v === null) {
      lines.push(k.toUpperCase())
    } else {
      if (integerProperties.has(k.toLowerCase())) {
        lines.push(`${k.toUpperCase()} ${v}`)
      } else {
        lines.push(`${k.toUpperCase()} "${v}"`)
      }
    }
  }

  lines.push('ENDPROPERTIES')

  // ---- Glyph count ----
  lines.push(`CHARS ${font.glyphs.size}`)

  // ---- Glyphs ----
  font.glyphs.values().forEach(g => {
    const {
      glyphname,
      codepoint,
      bbw,
      bbh,
      bbxoff,
      bbyoff,
      swx0,
      swy0,
      dwx0,
      dwy0,
      swx1,
      swy1,
      dwx1,
      dwy1,
      vvectorx,
      vvectory,
      bitmap: hexdata,
    } = g;

    lines.push(`STARTCHAR ${glyphname}`);
    lines.push(`ENCODING ${codepoint}`);

    if (swx0 != null && swy0 != null) lines.push(`SWIDTH ${swx0} ${swy0}`);
    if (dwx0 != null && dwy0 != null) lines.push(`DWIDTH ${dwx0} ${dwy0}`);

    lines.push(`BBX ${bbw} ${bbh} ${bbxoff} ${bbyoff}`);

    if (swx1 != null && swy1 != null) lines.push(`SWIDTH1 ${swx1} ${swy1}`);
    if (dwx1 != null && dwy1 != null) lines.push(`DWIDTH1 ${dwx1} ${dwy1}`);
    if (vvectorx != null && vvectory != null) lines.push(`VVECTOR ${vvectorx} ${vvectory}`);

    lines.push('BITMAP');
    for (const row of bools2hexdata(hexdata)) lines.push(row);
    lines.push('ENDCHAR');
  });

  lines.push('ENDFONT');

  lines.push('');

  return lines.join('\n');
}

/**
 * Similar to `.iterglyphs()`, except it returns an `array` of glyph codepoints instead of an `iterator` of `Glyph` objects.
 *
 * @param font  - Font with character
 * @param order  - Order
 * @param range  - Codepoint range
 *
 * @returns An iterator of the codepoints of glyphs
 */
export function itercps(
  font: Font,
  order?: OrderType,
  range?: number | [number, number] | [number, number][]
): number[] {
  order = order ?? 1;
  let ret: number[];
  const ks = [...font.glyphs.keys()];
  switch (order) {
    case 1:
      ret = ks.sort((a: number, b: number): number => a - b);
      break;
    case 0:
      ret = ks;
      break;
    case 2:
      ret = ks.sort((a: number, b: number): number => b - a);
      break;
    case -1:
      ret = ks.reverse();
      break;
  }
  if (range !== undefined) {
    const f = (cp: number): boolean => {
      if (typeof range === 'number') {
        return cp < range;
      } else if (
        Array.isArray(range) &&
        range.length === 2 &&
        typeof range[0] === 'number' &&
        typeof range[1] === 'number'
      ) {
        return cp <= range[1] && cp >= range[0];
      } else {
        if (Array.isArray(range) && Array.isArray(range[0])) {
          for (const t of range) {
            const [t0, t1] = t as [number, number]
            if (cp <= t1 && cp >= t0) {
              return true;
            }
          }
        }
        return false;
      }
    };
    ret = ret.filter(f);
  }
  return ret;
}

/**
 * Returns an iterator of all the glyphs (as `Glyph` objects) in the font (default) or in the specified codepoint range in the font, sorted by the specified order (or by the ascending codepoint order by default).
 *
 * @param font  - Font with character
 * @param order - Order
 * @param r     - Codepoint range
 *
 * @returns An iterator of glyphs as `Glyph` objects. Missing glyphs are replaced by `undefined`
 */
export function *iterglyphs(
  font: Font,
  order?: OrderType,
  r?: CodepointRangeType
): IterableIterator<Glyph | undefined> {
  for (const cp of itercps(font, order, r)) {
    yield glyphbycp(font, cp)
  }
}

/**
 * Get a glyph (as Glyph Object) by its codepoint.
 *
 * @param font      - Font with character
 * @param codepoint - Codepoint
 *
 * @returns `Glyph` object, or `undefined` if the glyph does not exist in the font
 */
export function glyphbycp(font: Font, codepoint: number): Glyph | undefined {
  const glyph = font.glyphs.get(codepoint);

  if (!glyph) {
    console.warn(
      `Glyph "${String.fromCodePoint(
        codepoint
      )}" (codepoint ${codepoint.toString()}) does not exist in the font. Will return 'null'`
    );
    return;
  } else {
    return glyph;
  }
}

/**
 * Get a glyph (as `Glyph` object) by its character.
 *
 * @param font      - Font with character
 * @param character - Character
 *
 * @returns `Glyph` object, or `undefined` if the glyph does not exist in the font
 */
export function glyph(font: Font, character: string): Glyph | undefined {
  const ret = character.codePointAt(0);
  return ret !== undefined ? glyphbycp(font, ret) : undefined;
}

