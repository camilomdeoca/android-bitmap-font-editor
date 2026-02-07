import { View, Text } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useRef, useState } from "react";
import { Fonts } from "@/constants/theme";

export function CharacterEditor({
  bitmap,
  onChange,
  previewChar,
}: {
  bitmap: boolean[][],
  onChange: (bitmap: boolean[][]) => void,
  previewChar?: string,
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
                  borderColor,
                  borderWidth: 1,
                }}
              >
              </View>
            ))}
          </View>
        ))}
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
