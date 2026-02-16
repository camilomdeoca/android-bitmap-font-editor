import { ScrollView, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

import * as DocumentPicker from "expo-document-picker"
import {  load_font } from "@/lib/bdfparser";
import { useFontStore } from "@/hooks/use-font-store";
import { ButtonContainer } from "@/components/ui/button-container";
import { BitmapText } from "@/components/ui/bitmap-text";

async function* linesFromString(text: string) {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    yield line
  }
}

export default function ProjectsListScreen() {
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  const setSelectedFontIdx = useFontStore(state => state.setSelectedFontIdx);
  const addFont = useFontStore(state => state.addFont);
  const deleteFont = useFontStore(state => state.deleteFont);
  const nonSelectedFonts = useFontStore(state => state.nonSelectedFonts);

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
      addFont(font)
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
        {(nonSelectedFonts ?? []).map((font, i) => <ButtonContainer
          key={i}
          onPress={() => setSelectedFontIdx(i)}
          style={{ flexDirection: "row", gap: 5 }}
        >
          <View style={{ flexDirection: "column", flex: 1 }}>
            <ThemedText style={{ color }} >{font.headers.fontname}</ThemedText>
            <BitmapText
              style={{ width: "100%" }}
              text="The quick brown fox jumps over the lazy dog"
              font={font}
            />
          </View>
          <ButtonContainer onPress={() => deleteFont(i)}>
            <IconSymbol name="trash.fill" color={color} />
          </ButtonContainer>
        </ButtonContainer>)}

        <ButtonContainer onPress={handleImportFont}>
          <IconSymbol name="plus" color={color} />
        </ButtonContainer>
      </View>
    </ScrollView>
  );
}
