import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Colors, Fonts } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";

import * as DocumentPicker from "expo-document-picker"
import { Font, load_font } from "@/lib/bdfparser";
import { useState } from "react";
import { useFontStore } from "@/hooks/use-font-store";

async function* linesFromString(text: string) {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    yield line
  }
}

export default function ProjectsListScreen() {
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const backgroundColorHover = useThemeColor({}, "backgroundHover");
  const backgroundColorActive = useThemeColor({}, "backgroundActive");
  const borderColor = useThemeColor({}, "borderDefault");

  const [fonts, setFonts] = useState<Font[]>([]);

  const setFont = useFontStore(state => state.setFont);

  const handleImportFont = () => {
    DocumentPicker.getDocumentAsync().then((result) => {
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      return fetch(uri);
    }).then((response) =>
      response?.text()
    ).then((fileText) => {
      if (fileText === undefined) return; 
      const iterator = linesFromString(fileText);
      return load_font(iterator);
    }).then((font) => {
      if (!font || !font.headers) return;
      setFonts(prev => [font, ...prev])
    });
  };

  return (
    <ScrollView style={{ height: "100%" }}>
      <View
        style={{
          backgroundColor,
          flex: 1,
          padding: 20,
          gap: 10,
          height: "100%",
        }}
      >
        {fonts.map((font, i) => <Pressable
          key={i}
          onPress={() => setFont(font)}
          style={({ pressed, hovered }) => ({
            borderWidth: 1,
            borderRadius: 10,
            borderColor,
            backgroundColor: pressed ? backgroundColorActive : hovered ? backgroundColorHover : backgroundColor,
            padding: 10,
          })}
        >
          <ThemedText style={{ color }} >{font.headers.fontname}</ThemedText>
          <ThemedText style={styles.fontPreview} numberOfLines={1}>
            The quick brown fox jumps over the lazy dog
          </ThemedText>
        </Pressable>)}

        <Pressable
          style={({ pressed, hovered }) => ({
            borderWidth: 1,
            borderRadius: 10,
            borderColor,
            backgroundColor: pressed ? Colors.dark.backgroundActive : hovered ? backgroundColorHover : backgroundColor,
            padding: 10,
            alignItems: "center",
          })}
          onPress={handleImportFont}
        >
          <IconSymbol name="plus" color={color} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fontPreview: {
    fontFamily: Fonts.mono,
  },
});
