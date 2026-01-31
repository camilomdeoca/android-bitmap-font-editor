import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Fonts } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";

import * as DocumentPicker from "expo-document-picker"
import { Font, load_font } from "@/lib/bdfparser";
import { useFontStore } from "@/hooks/use-font-store";
import { ButtonContainer } from "@/components/ui/button-container";

import { useMMKVObject } from "react-native-mmkv";
import { useEffect, useState } from "react";
import { font2serializable, serializable2font, SerializableFont } from "@/lib/bdfparser/bdfparser";

async function* linesFromString(text: string) {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    yield line
  }
}

export default function ProjectsListScreen() {
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  const [persistedFonts, setPersistedFonts] = useMMKVObject<SerializableFont[]>("fonts_list");

  const [fonts, setFonts] = useState<Font[]>(
    () => (persistedFonts ?? []).map(serializable2font),
  );

  useEffect(() => {
    setPersistedFonts(fonts.map(font2serializable));
  }, [fonts, setPersistedFonts]);

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
      setFonts(prev => [font, ...(prev ?? [])])
    });
  };

  return (
    <ScrollView style={{ height: "100%", backgroundColor }}>
      <View
        style={{
          backgroundColor,
          flex: 1,
          padding: 20,
          gap: 10,
          height: "100%",
        }}
      >
        {(fonts ?? []).map((font, i) => <ButtonContainer key={i} onPress={() => setFont(font)}>
          <ThemedText style={{ color }} >{font.headers.fontname}</ThemedText>
          <ThemedText style={styles.fontPreview} numberOfLines={1}>
            The quick brown fox jumps over the lazy dog
          </ThemedText>
        </ButtonContainer>)}

        <ButtonContainer onPress={handleImportFont}>
          <IconSymbol name="plus" color={color} />
        </ButtonContainer>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fontPreview: {
    fontFamily: Fonts.mono,
  },
});
