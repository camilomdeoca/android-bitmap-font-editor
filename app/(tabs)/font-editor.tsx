import { Button, Modal, Pressable, TextInput, View } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { CharacterEditor } from "@/components/character-editor";
import { useFontStore } from "@/hooks/use-font-store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Font } from "@/lib/bdfparser";
import { useShallow } from "zustand/shallow";
import { Glyph, serializeToBDF } from "@/lib/bdfparser/bdfparser";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";

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

  const [glyphSettingsOpen, setGlyphSettingsOpen] = useState(false);
  
  const [charInputText, setCharInputText] = useState("");
  const [codePoint, setCodePoint] = useState<number | undefined>(undefined);
  const [codePointInputText, setCodePointInputText] = useState("");

  const { font, char } = useFontStore(useShallow(state => {
    const char = state.font && codePoint !== undefined
      ? state.font.glyphs.get(codePoint)
      : undefined;
    // if (state.font !== undefined && b === undefined) {
    //   throw new Error(`Font does not have char: "${charInputText}"`);
    // }
    return {
      font: state.font,
      char,
    };
  }));

  const setFont = useFontStore(state => state.setFont);

  const handleCharChange = (bitmap: boolean[][]) => {
    if (!char || !font || !codePoint) return;
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
          onChangeText={value => {
            const newChar = value.length > 0 ? value[value.length - 1] : value;
            setCharInputText(newChar);
            const newCodePoint = newChar.codePointAt(0);
            if (newCodePoint !== undefined) {
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

            const newCodePoint = value.length > 0 ? parseInt(value, 16) : undefined;
            setCodePoint(newCodePoint);
            setCharInputText(newCodePoint === undefined ? "" : String.fromCodePoint(newCodePoint))
          }}
        />
        <Pressable
          style={({ pressed, hovered }) => ({
            borderWidth: 1,
            borderRadius: 10,
            borderColor,
            backgroundColor: pressed ? backgroundColorActive : hovered ? backgroundColorHover : backgroundColor,
            padding: 10,
            alignItems: "center",
          })}
          disabled={codePoint === undefined || (font && font.glyphs.has(codePoint))}
          onPress={() => {
            if (!codePoint) throw new Error("Button should be disabled if no code point");
            if (!font) throw new Error("");

            const char0 = font.glyphs.get(0);
            if (!char0) throw new Error("Font doesnt have char0.");

            const glyph: Glyph = {
              ...char0,
              glyphname: `U+${codePoint.toString(16).toUpperCase().padStart(8, "0")}`,
              codepoint: codePoint,
              bitmap: char0.bitmap.map(row => [...row]),
            };

            font.glyphs.set(codePoint, glyph);
          }}
        >
          <IconSymbol name="plus" color={color} size={28} />
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        {char && <CharacterEditor bitmap={char.bitmap} onChange={handleCharChange} />}
      </View>
      <View style={{ flexDirection: "row" }}>
        <Pressable
          style={({ pressed, hovered }) => ({
            borderWidth: 1,
            borderRadius: 10,
            borderColor,
            backgroundColor: pressed ? backgroundColorActive : hovered ? backgroundColorHover : backgroundColor,
            padding: 10,
            alignItems: "center",
          })}
          onPress={() => setGlyphSettingsOpen(true)}
        >
          <IconSymbol name="gear" color={color} size={28} />
        </Pressable>
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
      {font && codePoint && char && <Modal animationType="slide" visible={glyphSettingsOpen} transparent>
        <View style={{ flex: 1, flexDirection: "column" }}>
          <Pressable
            style={{
              flexGrow: 1,
            }}
            onPress={() => setGlyphSettingsOpen(false)}
          >
          </Pressable>
          <View style={{
            flexDirection: "row",
            backgroundColor,
            width: "100%",
            bottom: 0,
            borderTopRightRadius: 10,
            borderTopLeftRadius: 10,
            borderWidth: 1,
            borderColor,
            padding: 10,
            position: "absolute",
          }}>
            <ThemedText style={{ color }}>Width = {char.bbw}</ThemedText>
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
                char.bbw -= 1;
                char.bitmap = [...char.bitmap];
                char.bitmap = char.bitmap.map(row => row.toSpliced(row.length - 1, 1));
                font.glyphs.set(codePoint, {...char})
                setFont({ ...font });
              }}
            >
              <IconSymbol name="minus" color={color} size={28} />
            </Pressable>
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
                char.bbw += 1;
                char.bitmap = [...char.bitmap];
                char.bitmap = char.bitmap.map(row => [...row, false]);
                font.glyphs.set(codePoint, {...char})
                setFont({ ...font });
              }}
            >
              <IconSymbol name="plus" color={color} size={28} />
            </Pressable>
          </View>
        </View>
      </Modal>}
    </View>
  );
}
