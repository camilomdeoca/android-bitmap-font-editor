import { Modal, Platform, Pressable, TextInput, View } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { CharacterEditor } from "@/components/character-editor";
import { useFontStore } from "@/hooks/use-font-store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Font } from "@/lib/bdfparser";
import { useShallow } from "zustand/shallow";
import { Glyph, serializeToBDF } from "@/lib/bdfparser/bdfparser";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { ButtonContainer } from "@/components/ui/button-container";

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useFonts } from "expo-font";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/theme";

/// Has to be called from a click
function saveFontToFile(font: Font) {
  const filename = `${font.props.get("family_name") || "font"}.bdf`;
  const content = serializeToBDF(font);

  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: "application/x-font-bdf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  } else {
    (async () => {
      const file = new File(Paths.cache, filename);
      file.write(content);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/plain', // standard MIME type for text
        dialogTitle: 'Save your text file', // Android only
        UTI: 'public.plain-text', // iOS only (helps suggest "text" apps)
      });
    })();
  }
}

export default function FontEditor() {
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "borderDefault");

  const [loaded] = useFonts({
    'monospaced-nerd-font': require('@/assets/fonts/FiraCodeNerdFont-Medium.ttf'),
  });

  const [glyphSettingsOpen, setGlyphSettingsOpen] = useState(false);
  
  const [charInputText, setCharInputText] = useState("");
  const [codePointInputText, setCodePointInputText] = useState("");

  const { font, char, selectedCodepoint } = useFontStore(useShallow(state => {
    const char = state.font
      ? state.font.glyphs.get(state.selectedCodepoint)
      : undefined;
    return {
      font: state.font,
      char,
      selectedCodepoint: state.selectedCodepoint,
    };
  }));

  const setFont = useFontStore(state => state.setFont);
  const updateGlyph = useFontStore(state => state.updateGlyph);
  const setSelectedCodepoint = useFontStore(state => state.setSelectedCodepoint);

  const handleCharChange = (bitmap: boolean[][]) => {
    if (!char || !font) return;
    const updatedGlyph = { ...char, bitmap };

    updateGlyph(selectedCodepoint, updatedGlyph);
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
            fontFamily: loaded ? "monospaced-nerd-font" : Fonts.mono,
          }}
          value={charInputText}
          onChangeText={value => {
            const newChar = value.length > 0 ? value[value.length - 1] : value;
            setCharInputText(newChar);
            const newCodePoint = newChar.codePointAt(0);
            if (newCodePoint !== undefined) {
              setCodePointInputText(newCodePoint.toString(16));
              setSelectedCodepoint(newCodePoint);
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
            if (newCodePoint !== undefined) setSelectedCodepoint(newCodePoint);
            setCharInputText(newCodePoint === undefined ? "" : String.fromCodePoint(newCodePoint))
          }}
        />
        <ButtonContainer
          disabled={font && font.glyphs.has(selectedCodepoint)}
          onPress={() => {
            if (!font) throw new Error("");

            const char0 = font.glyphs.get(0);
            if (!char0) throw new Error("Font doesnt have char0.");

            const glyph: Glyph = {
              ...char0,
              glyphname: `U+${selectedCodepoint.toString(16).toUpperCase().padStart(8, "0")}`,
              codepoint: selectedCodepoint,
              bitmap: char0.bitmap.map(row => [...row]),
            };

            font.glyphs.set(selectedCodepoint, glyph);
            setFont({ ...font });
          }}
        >
          <IconSymbol name="plus" color={color} size={28} />
        </ButtonContainer>
      </View>
      <View style={{ flex: 1 }}>
        {char && <CharacterEditor bitmap={char.bitmap} onChange={handleCharChange} />}
      </View>
      {font && <View style={{ flexDirection: "row", gap: 10 }}>
        <ButtonContainer onPress={() => setGlyphSettingsOpen(true)}>
          <IconSymbol name="gear" color={color} size={28} />
        </ButtonContainer>
        <ButtonContainer onPress={() => saveFontToFile(font)}>
          <IconSymbol name="square.and.arrow.down" color={color} size={28} />
        </ButtonContainer>
      </View>}
      {font && char && <Modal animationType="slide" visible={glyphSettingsOpen} transparent>
        <SafeAreaView
          edges={["bottom", "right", "left"]}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, flexDirection: "column" }}>
            <Pressable style={{ flexGrow: 1 }} onPress={() => setGlyphSettingsOpen(false)} />
            <View style={{
              flexDirection: "row",
              backgroundColor,
              width: "100%",
              bottom: 0,
              borderTopRightRadius: 10,
              borderTopLeftRadius: 10,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor,
              padding: 10,
              position: "absolute",
              gap: 10,
            }}>
              <ThemedText style={{ color }}>Width = {char.bbw}</ThemedText>
              <ButtonContainer
                onPress={() => {
                  char.bbw -= 1;
                  char.bitmap = [...char.bitmap];
                  char.bitmap = char.bitmap.map(row => row.toSpliced(row.length - 1, 1));
                  updateGlyph(selectedCodepoint, {...char})
                }}
              >
                <IconSymbol name="minus" color={color} size={28} />
              </ButtonContainer>
              <ButtonContainer
                onPress={() => {
                  char.bbw += 1;
                  char.bitmap = [...char.bitmap];
                  char.bitmap = char.bitmap.map(row => [...row, false]);
                  updateGlyph(selectedCodepoint, {...char})
                }}
              >
                <IconSymbol name="plus" color={color} size={28} />
              </ButtonContainer>
            </View>
          </View>
        </SafeAreaView>
      </Modal>}
    </View>
  );
}
