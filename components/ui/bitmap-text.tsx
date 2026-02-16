import { Glyph, SerializableFont } from "@/lib/bdfparser";
import { useEffect, useState } from "react";
import { PixelRatio, View, ViewProps } from "react-native";
import { Canvas, Image, Skia, AlphaType, ColorType, SkImage, FilterMode, MipmapMode } from "@shopify/react-native-skia";

type BitmapTextProps = {
  text: string,
  style?: ViewProps["style"],
  font: SerializableFont,
  scaleMultiplier?: number,
};

function canRenderText(glyphs: Map<number, Glyph>, text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const codepoint = text[i].codePointAt(0);
    if (!codepoint || !glyphs.has(codepoint)) return false;
  }
  return true;
}

export function BitmapText({
  text,
  style,
  font,
  scaleMultiplier = PixelRatio.get() * 1.5,
}: BitmapTextProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<SkImage | null>(null);

  useEffect(() => {
    const glyphs = new Map(font.glyphs);

    // In icon fonts there is no letters so we cant render the text
    let finalText = text;
    if (!canRenderText(glyphs, text)) {
      finalText = String.fromCodePoint(...[...glyphs.keys()].sort())
    }

    const pixels = new Uint8Array(size.width * size.height * 4);
    let cursor = 0;
    for (let i = 0; i < finalText.length; i++) {
      if (cursor > size.width) break;
      const char = finalText[i];
      let codepoint = char.codePointAt(0);
      if (codepoint === undefined) throw new Error(`Char \`${char}\` is an invalid character`);
      if (!glyphs.has(codepoint)) codepoint = 0;
      const glyph = glyphs.get(codepoint);
      if (!glyph) throw new Error(`Codepoint \`${codepoint}\` does not exist in font`);

      for (let y = 0; y < glyph.bitmap.length; y++) {
        for (let x = 0; x < glyph.bitmap[y].length; x++) {
          if (cursor + x >= size.width || y >= size.height) continue;
          const value = glyph.bitmap[y][x] ? 255 : 0;
          pixels[(y * size.width + cursor + x) * 4 + 0] = value;
          pixels[(y * size.width + cursor + x) * 4 + 1] = value;
          pixels[(y * size.width + cursor + x) * 4 + 2] = value;
          pixels[(y * size.width + cursor + x) * 4 + 3] = value;
        }
      }

      if (finalText !== text)
        // We assume this is a font of icons
        cursor += glyph.bbw;
      else
        cursor += glyph.dwx0 ?? font.headers.dwx0 ?? font.headers.fbbx;
    }

    const data = Skia.Data.fromBytes(pixels);
    const img = Skia.Image.MakeImage(
      {
        width: size.width,
        height: size.height,
        alphaType: AlphaType.Opaque,
        colorType: ColorType.RGBA_8888,
      },
      data,
      size.width * 4,
    );
    setImage(img);
  }, [font, size.height, size.width, text]);

  return <View
    style={[
      {
        height: font.headers.pointsize * scaleMultiplier / PixelRatio.get(),
        // borderWidth: 1,
        borderColor: "green",
      },
      style,
    ]}
    onLayout={(ev) => {
      setSize({
        width: PixelRatio.getPixelSizeForLayoutSize(PixelRatio.roundToNearestPixel(ev.nativeEvent.layout.width / scaleMultiplier)),
        height: PixelRatio.getPixelSizeForLayoutSize(PixelRatio.roundToNearestPixel(ev.nativeEvent.layout.height / scaleMultiplier)),
      });
    }}
  >
    <Canvas style={{ flex: 1 }}>
      <Image
        image={image}
        fit="contain"
        x={0}
        y={0}
        width={size.width * scaleMultiplier / PixelRatio.get()}
        height={size.height * scaleMultiplier / PixelRatio.get()}
        antiAlias={false}
        sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.Nearest }}
      />
    </Canvas>
  </View>;
}
