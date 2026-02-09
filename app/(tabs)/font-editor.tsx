import { Modal, Pressable, View , Platform, Switch } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { CharacterEditor } from "@/components/character-editor";
import { useFontStore } from "@/hooks/use-font-store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Font } from "@/lib/bdfparser";
import { useShallow } from "zustand/shallow";
import { Glyph, serializeToBDF } from "@/lib/bdfparser/bdfparser";
import { useMemo, useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { ButtonContainer } from "@/components/ui/button-container";

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/theme";
import { ThemedTextInput } from "@/components/ui/themed-text-input";
import { Select } from "@/components/ui/select";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

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

function canFromCodePoint(value: number): boolean {
  try {
    String.fromCodePoint(value);
    return true;
  } catch {
    return false;
  }
}

export default function FontEditor() {
  const color = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "borderDefault");

  const [glyphSettingsOpen, setGlyphSettingsOpen] = useState(false);

  const { font, char, selectedCodepoint } = useFontStore(useShallow(state => {
    const char = state.font
      ? state.font.glyphs.get(state.selectedCodepoint)
      : undefined;
    const selectedCodepoint = canFromCodePoint(state.selectedCodepoint)
      ? state.selectedCodepoint
      : 0;
    return {
      font: state.font,
      char,
      selectedCodepoint,
    };
  }));

  const [charInputText, setCharInputText] =
    useState(() => String.fromCodePoint(selectedCodepoint));
  const [codePointInputText, setCodePointInputText] =
    useState(() => selectedCodepoint.toString(16));

  const setFont = useFontStore(state => state.setFont);
  const updateGlyph = useFontStore(state => state.updateGlyph);
  const setSelectedCodepoint = useFontStore(state => state.setSelectedCodepoint);

  const handleGlyphNameChange = (newName: string) => {
    if (char && newName.trim() && newName.trim() !== char.glyphname) {
      const updatedGlyph = { ...char, glyphname: newName.trim() };
      updateGlyph(selectedCodepoint, updatedGlyph);
    }
  };

  const handleCharChange = (bitmap: boolean[][]) => {
    if (!char || !font) return;
    const updatedGlyph = { ...char, bitmap };

    updateGlyph(selectedCodepoint, updatedGlyph);
  };

  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [boundingBoxEnabled, setBoundingBoxEnabled] = useState(true);

  const { charPickerOptions, charPickerOptionCodepoints } = useMemo(() => {
    const charPickerOptions = [];
    const charPickerOptionCodepoints = [];
    const entries = [...(font?.glyphs.entries() ?? [])];
    entries.sort(([aCodepoint], [bCodepoint]) => aCodepoint - bCodepoint);
    for (const [codepoint, glyph] of entries) {
      const char = String.fromCodePoint(codepoint);
      const hex = codepoint.toString(16).toUpperCase().padStart(4, "0");
      charPickerOptions.push(`${char} - ${hex} - ${glyph.glyphname}`);
      charPickerOptionCodepoints.push(codepoint);
    }
    return { charPickerOptions, charPickerOptionCodepoints };
  }, [font]);
  const [selectedCodepointIdx, setSelectedCodepointIdx] = useState(
    () => charPickerOptionCodepoints.findIndex(codepoint => codepoint === selectedCodepoint),
  );

  const keyboardHeight = useKeyboardHeight();

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
        <Select
          options={charPickerOptions}
          onValueChange={idx => {
            setSelectedCodepointIdx(idx);
            const newCodePoint = charPickerOptionCodepoints[idx];
            setCodePointInputText(newCodePoint.toString(16));
            setSelectedCodepoint(newCodePoint);
            setCharInputText(String.fromCodePoint(newCodePoint))
          }}
          value={selectedCodepointIdx}
          optionTextStyle={{ fontFamily: Fonts.fontPreview }}
          filterable
        />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <ThemedTextInput
          style={{
            flex: 1,
            fontFamily: Fonts.fontPreview,
            fontSize: 20,
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
        <ThemedTextInput
          style={{
            flex: 1,
            fontFamily: Fonts.mono,
            fontSize: 20
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
          <IconSymbol name="plus" color={color} size={36} />
        </ButtonContainer>
      </View>
      <View
        style={{
          flex: 1,
          alignItems: "center",
        }}
      >
        {char && <CharacterEditor
          bitmap={char.bitmap}
          onChange={handleCharChange}
          previewChar={overlayEnabled ? String.fromCodePoint(selectedCodepoint) : undefined}
          showGrid={gridEnabled}
          showBoundingBox={boundingBoxEnabled}
          glyph={char}
        />}
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
          <View style={{ flex: 1, flexDirection: "column", marginBottom: keyboardHeight }}>
            <Pressable style={{ flexGrow: 1 }} onPress={() => setGlyphSettingsOpen(false)} />
            <View style={{
              flexDirection: "column",
              backgroundColor,
              width: "100%",
              borderTopRightRadius: 10,
              borderTopLeftRadius: 10,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor,
              padding: 10,
              gap: 10,
            }}>
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}>
                <ThemedText style={{ color }}>Name:</ThemedText>
                <ThemedTextInput
                  style={{ flex: 1 }}
                  value={char.glyphname}
                  onChangeText={handleGlyphNameChange}
                  placeholder="Character name"
                />
              </View>
              <View style={{ width: "100%", flexDirection: "row" }}>
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
              <View style={{ width: "100%", flexDirection: "row" }}>
                <ThemedText style={{ color }}>Toggle overlay</ThemedText>
                <Switch value={overlayEnabled} onValueChange={setOverlayEnabled} />
              </View>
              <View style={{ width: "100%", flexDirection: "row" }}>
                <ThemedText style={{ color }}>Toggle grid</ThemedText>
                <Switch value={gridEnabled} onValueChange={setGridEnabled} />
              </View>
              <View style={{ width: "100%", flexDirection: "row" }}>
                <ThemedText style={{ color }}>Toggle bounding box</ThemedText>
                <Switch value={boundingBoxEnabled} onValueChange={setBoundingBoxEnabled} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>}
    </View>
  );
}
