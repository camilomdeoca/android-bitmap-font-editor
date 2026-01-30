import { Pressable, TextInput, View } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { CharacterEditor } from "@/components/character-editor";
import { useFontStore } from "@/hooks/use-font-store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Font } from "@/lib/bdfparser";
import { useShallow } from "zustand/shallow";
import { glyphbycp, serializeToBDF } from "@/lib/bdfparser/bdfparser";
import { useState } from "react";

/// Has to be called from a click
function saveFontToFile(font: Font) {
  const blob = new Blob([serializeToBDF(font)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${font.props.get("family_name") || "font"}.bdf`
  link.click();
}

export default function FontEditor() {
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const backgroundColorHover = useThemeColor({}, "backgroundHover");
  const backgroundColorActive = useThemeColor({}, "backgroundActive");
  const borderColor = useThemeColor({}, "borderDefault");
  
  const [charInputText, setCharInputText] = useState("A");
  const [codePoint, setCodePoint] = useState(() => {
    const codePoint = charInputText.codePointAt(0);
    if (!codePoint) throw new Error(`Invalid default char ${charInputText}`);
    return codePoint;
  });
  const [codePointInputText, setCodePointInputText] = useState(codePoint.toString(16));

  const { font, char } = useFontStore(useShallow(state => {
    const b = state.font && glyphbycp(state.font, codePoint);
    if (state.font !== undefined && b === undefined) {
      throw new Error(`Font does not have char: "${charInputText}"`);
    }
    return {
      font: state.font,
      char: b,
    };
  }));

  const setFont = useFontStore(state => state.setFont);

  const handleCharChange = (bitmap: boolean[][]) => {
    if (!char || !font) return;
    const b = font.glyphs.get(codePoint);
    if (!b) throw new Error(`Font does not have char: ...`);
    b.bitmap = bitmap;

    setFont({ ...font });
  };

  return (
    <View
      style={{
        backgroundColor,
        flex: 1,
        flexDirection: "column",
        padding: 20,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          style={{
            flex: 1,
            color,
            borderColor,
            borderWidth: 1,
            borderRadius: 10,
          }}
          value={charInputText}
          onChangeText={newCurrentCharacter => {
            const newChar = newCurrentCharacter[newCurrentCharacter.length - 1];
            setCharInputText(newChar);
            const newCodePoint = newChar.codePointAt(0);
            if (newCodePoint !== undefined && font?.glyphs.has(newCodePoint)) {
              setCodePoint(newCodePoint);
              setCodePointInputText(newCodePoint.toString(16));
            }
          }}
        />
        <TextInput
          style={{
            flex: 1,
            color,
            borderColor,
            borderWidth: 1,
            borderRadius: 10,
          }}
          value={codePointInputText}
          onChangeText={value => {
            if (!/^[0-9A-Fa-f]{0,8}$/.test(value)) return;
            setCodePointInputText(value.toLowerCase());

            const newCodePoint = parseInt(value, 16);
            // If new value is valid codepoint update other inputs and codepoint
            if (font?.glyphs.has(newCodePoint)) {
              setCodePoint(newCodePoint);
              setCharInputText(String.fromCodePoint(newCodePoint))
            }
          }}
        />
      </View>
      <View style={{ flex: 1 }}>
        {char && <CharacterEditor bitmap={char.bitmap} onChange={handleCharChange} />}
      </View>
      <Pressable
        style={({ pressed, hovered }) => ({
          borderWidth: 1,
          borderRadius: 10,
          borderColor,
          backgroundColor: pressed ? backgroundColorActive : hovered ? backgroundColorHover : backgroundColor,
          padding: 10,
          alignItems: "center",
        })}
        onPress={() => {
          if (!font) return;
          saveFontToFile(font);
        }}
      >
        <IconSymbol name="square.and.arrow.down" color={color} size={28} />
      </Pressable>
    </View>
  );
}
