import {  View } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useRef } from "react";

export function CharacterEditor({
  bitmap,
  onChange,
}: {
  bitmap: boolean[][],
  onChange: (bitmap: boolean[][]) => void,
}) {
  const borderColor = useThemeColor({}, "borderDefault");

  const sizeRef = useRef({ width: 0, height: 0 });
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
        flexGrow: 1,
        maxWidth: "100%",
        maxHeight: "100%",
        aspectRatio: width / height,
        margin: "auto",
      }}
      onStartShouldSetResponder={() => true}
      onLayout={(e) => {
        sizeRef.current.width = e.nativeEvent.layout.width;
        sizeRef.current.height = e.nativeEvent.layout.height;
        console.log(e.nativeEvent.layout);
      }}
      onResponderStart={ev => {
        const x = Math.floor(ev.nativeEvent.locationX * width / sizeRef.current.width);
        const y = Math.floor(ev.nativeEvent.locationY * height / sizeRef.current.height);
        
        if (x < 0 || x >= width) return;
        if (y < 0 || y >= height) return;

        console.log(ev.nativeEvent.locationX, ev.nativeEvent.locationY);
        console.log(x, y);
        
        startingPixelStateRef.current = bitmap[y][x];

        const newBitmap = [...bitmap];
        newBitmap[y] = [...newBitmap[y]];
        newBitmap[y][x] = !startingPixelStateRef.current;

        onChange(newBitmap);
      }}
      onResponderMove={ev => {
        const x = Math.floor(ev.nativeEvent.locationX * width / sizeRef.current.width);
        const y = Math.floor(ev.nativeEvent.locationY * height / sizeRef.current.height);

        if (x < 0 || x >= width) return;
        if (y < 0 || y >= height) return;

        console.log(ev.nativeEvent.locationX, ev.nativeEvent.locationY);
        console.log(x, y);

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
    </View>
  );
}
