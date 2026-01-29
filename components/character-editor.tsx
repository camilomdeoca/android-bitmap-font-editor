import {  View } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useRef } from "react";

export function CharacterEditor({
  char,
  width,
  onChange,
}: {
  char: string[],
  width: number,
  onChange: (char: string[]) => void,
}) {
  const borderColor = useThemeColor({}, "borderDefault");

  const sizeRef = useRef({ width: 0, height: 0 });
  const startingPixelStateRef = useRef(false);

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
        aspectRatio: width / char.length,
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
        const y = Math.floor(ev.nativeEvent.locationY * char.length / sizeRef.current.height);
        
        if (x < 0 || x >= width) return;
        if (y < 0 || y >= char.length) return;

        console.log(ev.nativeEvent.locationX, ev.nativeEvent.locationY);
        console.log(x, y);

        const rowInHex = char[y];
        
        const rowInBinary = parseInt(rowInHex, 16) // Convert to number
          .toString(2) // Convert to string of binary number
          .padStart(rowInHex.length*4, "0"); // Pad to multiple of byte count because it starts

        startingPixelStateRef.current = rowInBinary[x] === "1";
        
        const newBit = !startingPixelStateRef.current ? "1" : "0";
        const newBinary = rowInBinary.substring(0, x) + newBit + rowInBinary.substring(x + 1);

        const newChar = [...char];
        newChar[y] = parseInt(newBinary, 2).toString(16).padStart(char[y].length, "0");

        console.log(rowInBinary, newBinary);
        console.log(newChar[y]);

        if (newChar[y].length !== char[y].length)
          throw new Error(`length of hex glyph row changed: ${char[y]} -> ${newChar[y]}`);
        onChange(newChar);
      }}
      onResponderMove={ev => {
        const x = Math.floor(ev.nativeEvent.locationX * width / sizeRef.current.width);
        const y = Math.floor(ev.nativeEvent.locationY * char.length / sizeRef.current.height);

        if (x < 0 || x > sizeRef.current.width) return;
        if (y < 0 || y > sizeRef.current.height) return;

        console.log(ev.nativeEvent.locationX, ev.nativeEvent.locationY);
        console.log(x, y);

        const rowInHex = char[y];
        if (rowInHex === undefined) console.warn("char =", char);
        
        const rowInBinary = parseInt(rowInHex, 16) // Convert to number
          .toString(2) // Convert to string of binary number
          .padStart(rowInHex.length*4, "0"); // Pad to multiple of byte count because it starts
                                             // from left and could be 0

        const newBit = !startingPixelStateRef.current ? "1" : "0";
        const newBinary = rowInBinary.substring(0, x) + newBit + rowInBinary.substring(x + 1);

        const newChar = [...char];
        newChar[y] = parseInt(newBinary, 2).toString(16).padStart(char[y].length, "0");

        console.log(rowInBinary, newBinary);
        console.log(newChar[y]);

        if (newChar[y].length !== char[y].length)
          throw new Error(`length of hex glyph row changed: ${char[y]} -> ${newChar[y]}`);
        onChange(newChar);
      }}
    >
      {char.map((rowInHex, y) => {
        const rowInBinary = parseInt(rowInHex, 16) // Convert to number
          .toString(2) // Convert to string of binary number
          .padStart(rowInHex.length*4, "0"); // Pad to multiple of byte count because it starts
                                             // from left and could be 0

        return <View
          key={y}
          pointerEvents="none"
          style={{
            flexDirection: "row",
            flex: 1,
          }}
        >
          {rowInBinary.substring(0, width) // Remove extra characters in the right
            .split("").map((state, x) => (
            <View
              key={x}
              pointerEvents="none"
              style={{
                backgroundColor: state === "0" ? "#ffffff" : "black",
                flex: 1,
                aspectRatio: 1,
                borderColor,
                borderWidth: 1,
              }}
            >
            </View>
          ))}
        </View>;
      })}
    </View>
    </View>
  );
}
