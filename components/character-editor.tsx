import { View, Text, ColorValue } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useRef, useState } from "react";
import { Fonts } from "@/constants/theme";
import { Glyph } from "@/lib/bdfparser";

function renderGrid(width: number, height: number, backgroundColor: ColorValue) {
  const verticalLines = [];
  for (let i = 0; i <= width; i++) {
    verticalLines.push(<View
      key={i}
      style={{
        width: 1,
        backgroundColor,
        height: "100%",
      }}
    />);
  }

  const horizontalLines = [];
  for (let i = 0; i <= height; i++) {
    horizontalLines.push(<View
      key={i}
      style={{
        height: 1,
        backgroundColor,
        width: "100%",
      }}
    />);
  }

  return <View style={{
    position: "absolute",
    width: "100%",
    height: "100%",
  }}>
    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "space-between",
        flexDirection: "row",
      }}
      pointerEvents="none"
    >
     {verticalLines}
    </View>

    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "space-between",
        flexDirection: "column",
      }}
      pointerEvents="none"
    >
     {horizontalLines}
    </View>
  </View>;
}

function renderBoundingBox(glyph: Glyph, backgroundColor: ColorValue) {
  const verticalLines = [];
  for (let i = 0; i <= glyph.bbw; i++) {
    const shouldBeColored =
      glyph.bbw - i === glyph.bbw + glyph.bbxoff || // Show the character offset
      i === glyph.dwx0; // Show advance
    verticalLines.push(<View
      key={i}
      style={{
        width: 1,
        backgroundColor: shouldBeColored ? backgroundColor : undefined,
        height: "100%",
      }}
    />);
  }

  const horizontalLines = [];
  for (let i = 0; i <= glyph.bbh; i++) {
    const shouldBeColored =
      i === glyph.bbh + glyph.bbyoff || // Show the character offset
      i === glyph.dwy0; // Show advance
    horizontalLines.push(<View
      key={i}
      style={{
        height: 1,
        backgroundColor: shouldBeColored ? backgroundColor : undefined,
        width: "100%",
      }}
    />);
  }

  return <View style={{
    position: "absolute",
    width: "100%",
    height: "100%",
  }}>
    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "space-between",
        flexDirection: "row",
      }}
      pointerEvents="none"
    >
     {verticalLines}
    </View>

    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "space-between",
        flexDirection: "column",
      }}
      pointerEvents="none"
    >
     {horizontalLines}
    </View>
  </View>;
}

export function CharacterEditor({
  bitmap,
  onChange,
  previewChar,
  glyph,
  showGrid = true,
  showBoundingBox = true,
}: {
  bitmap: boolean[][],
  onChange: (bitmap: boolean[][]) => void,
  previewChar?: string,
  showGrid?: boolean,
  showBoundingBox?: boolean,
  glyph: Glyph,
}) {
  const borderColor = useThemeColor({}, "borderDefault");

  const [size, setSize] = useState({ width: 1, height: 1 });
  const startingPixelStateRef = useRef(false);

  const width = bitmap[0].length;
  const height = bitmap.length;

  return (
    <View
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <View
        style={{
          flexDirection: "column",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: width / height,
          margin: "auto",
        }}
        onStartShouldSetResponder={() => true}
        onLayout={(e) => {
          setSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          });
        }}
        onResponderStart={ev => {
          const x = Math.floor(ev.nativeEvent.locationX * width / size.width);
          const y = Math.floor(ev.nativeEvent.locationY * height / size.height);
          
          if (x < 0 || x >= width) return;
          if (y < 0 || y >= height) return;
          
          startingPixelStateRef.current = bitmap[y][x];

          const newBitmap = [...bitmap];
          newBitmap[y] = [...newBitmap[y]];
          newBitmap[y][x] = !startingPixelStateRef.current;

          onChange(newBitmap);
        }}
        onResponderMove={ev => {
          const x = Math.floor(ev.nativeEvent.locationX * width / size.width);
          const y = Math.floor(ev.nativeEvent.locationY * height / size.height);

          if (x < 0 || x >= width) return;
          if (y < 0 || y >= height) return;

          const newBitmap = [...bitmap];
          newBitmap[y] = [...newBitmap[y]];
          newBitmap[y][x] = !startingPixelStateRef.current;

          onChange(newBitmap);
        }}
      >
        <View style={{ flex: 1 }}>
          {bitmap.map((row, y) => (
            <View
              key={y}
              pointerEvents="none"
              style={{
                flexDirection: "row",
                flex: 1,
              }}
            >
              {row.map((state, x) => (
                <View
                  key={x}
                  pointerEvents="none"
                  style={{
                    backgroundColor: state ? "#ffffff" : "black",
                    flex: 1,
                    aspectRatio: 1,
                  }}
                >
                </View>
              ))}
            </View>
          ))}
        </View>
        {showGrid && renderGrid(bitmap[0].length, bitmap.length, borderColor)}
        {showBoundingBox && renderBoundingBox(glyph, "red")}
      </View>
      {previewChar !== undefined && <View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        pointerEvents="none"
      >
        <Text
          style={{
            height: size.height,
            lineHeight: size.height,
            fontSize: size.height,
            color: "blue",
            fontFamily: Fonts.fontPreview,
            opacity: 0.4,
            aspectRatio: width / height,
            margin: "auto",
          }}
        >
          {previewChar}
        </Text>
      </View>}
    </View>
  );
}
