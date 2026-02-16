import { Modal, Pressable, View , Platform, Switch } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { CharacterEditor } from "@/components/character-editor";
import { useFontStore } from "@/hooks/use-font-store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Font } from "@/lib/bdfparser";
import { useShallow } from "zustand/shallow";
import { Glyph, serializeToBDF } from "@/lib/bdfparser/bdfparser";
import { useEffect, useMemo, useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { ButtonContainer } from "@/components/ui/button-container";

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "@/constants/theme";
import { ThemedTextInput } from "@/components/ui/themed-text-input";
import { Select } from "@/components/ui/select";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { NumberInput } from "@/components/ui/number-input";

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
  const colorDisabled = useThemeColor({}, "textDisabled");
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

  const updateGlyph = useFontStore(state => state.updateGlyph);
  const deleteGlyph = useFontStore(state => state.deleteGlyph);
  const setSelectedCodepoint = useFontStore(state => state.setSelectedCodepoint);
  const beginOperation = useFontStore(state => state.beginOperation);
  const endOperation = useFontStore(state => state.endOperation);
  const undo = useFontStore(state => state.undo);
  const redo = useFontStore(state => state.redo);
  const canUndo = useFontStore(state => state.undoStack.length > 0);
  const canRedo = useFontStore(state => state.redoStack.length > 0);

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

  const [selectedCodepointIdx, setSelectedCodepointIdx] = useState(() => {
    const idx = charPickerOptionCodepoints.findIndex(codepoint => codepoint === selectedCodepoint);
    if (idx < 0) return undefined;
    return idx;
  });

  // Update other inputs when selectedCodepoint changes
  useEffect(() => {
    const idx = charPickerOptionCodepoints.findIndex(codepoint => codepoint === selectedCodepoint);
    if (idx < 0) return undefined;
    setSelectedCodepointIdx(idx);

    if (parseInt(codePointInputText, 16) !== selectedCodepoint)
      setCodePointInputText(selectedCodepoint.toString(16));
    if (charInputText.codePointAt(0) !== selectedCodepoint)
      setCharInputText(String.fromCodePoint(selectedCodepoint));
  }, [charInputText, charPickerOptionCodepoints, codePointInputText, font, selectedCodepoint]);

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
            setSelectedCodepoint(newCodePoint);
          }}
          value={selectedCodepointIdx}
          placeholder="Select a character..."
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

            updateGlyph(selectedCodepoint, glyph);
          }}
        >
          <IconSymbol name="plus" color={color} size={36} />
        </ButtonContainer>
      </View>

      {/* Bitmap editor */}
      <View style={{
        flex: 1,
        alignItems: "center",
      }}>
        {font && char && <CharacterEditor
          bitmap={char.bitmap}
          onChange={handleCharChange}
          onDragStart={(newValue) => beginOperation(selectedCodepoint, newValue)}
          onDragEnd={() => endOperation()}
          previewChar={overlayEnabled ? String.fromCodePoint(selectedCodepoint) : undefined}
          showGrid={gridEnabled}
          showBoundingBox={boundingBoxEnabled}
          glyph={char}
          fontHeight={font.headers.pointsize}
        />}
      </View>

      {/* Lower buttons */}
      {font && <View style={{ flexDirection: "row", gap: 10 }}>
        <ButtonContainer onPress={() => setGlyphSettingsOpen(true)}>
          <IconSymbol name="gear" color={color} size={28} />
        </ButtonContainer>
        <ButtonContainer onPress={() => saveFontToFile(font)}>
          <IconSymbol name="square.and.arrow.down" color={color} size={28} />
        </ButtonContainer>
        {char && <ButtonContainer onPress={() => {
          deleteGlyph(selectedCodepoint);
          setSelectedCodepointIdx(undefined);
        }}>
          <IconSymbol name="trash.fill" color={color} size={28} />
        </ButtonContainer>}
        <ButtonContainer onPress={() => undo()} disabled={!canUndo}>
          <IconSymbol name="arrow.turn.up.left" color={canUndo ? color : colorDisabled} size={28} />
        </ButtonContainer>
        <ButtonContainer onPress={() => redo()} disabled={!canRedo}>
          <IconSymbol name="arrow.turn.up.right" color={canRedo ? color : colorDisabled} size={28} />
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
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}>
                <ThemedText>Width</ThemedText>
                <NumberInput
                  style={{ flex: 1 }}
                  value={char.bbw}
                  min={0}
                  max={256}
                  step={1}
                  onValueChange={(newValue) => {
                    const delta = newValue - char.bbw;
                    if (delta > 0) {
                      char.bbw += 1;
                      char.bitmap = [...char.bitmap];
                      char.bitmap = char.bitmap.map(row => [...row, false]);
                      updateGlyph(selectedCodepoint, {...char})
                    } else {
                      char.bbw -= 1;
                      char.bitmap = [...char.bitmap];
                      char.bitmap = char.bitmap.map(row => row.toSpliced(row.length - 1, 1));
                      updateGlyph(selectedCodepoint, {...char})
                    }
                  }}
                />
              </View>
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}>
                <ThemedText>Height</ThemedText>
                <NumberInput
                  style={{ flex: 1 }}
                  value={char.bbh}
                  min={0}
                  max={256}
                  step={1}
                  onValueChange={(newValue) => {
                    const delta = newValue - char.bbh;
                    if (delta > 0) {
                      char.bbh += 1;
                      char.bitmap = [Array(char.bbw).fill(false), ...char.bitmap];
                      updateGlyph(selectedCodepoint, {...char})
                    } else {
                      char.bbh -= 1;
                      char.bitmap = char.bitmap.toSpliced(0, 1);
                      updateGlyph(selectedCodepoint, {...char})
                    }
                  }}
                />
              </View>
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}>
                <ThemedText>Advance width</ThemedText>
                <NumberInput
                  style={{ flex: 1 }}
                  value={char.dwx0 ?? font.headers.dwx0 ?? font.headers.fbbx}
                  min={0}
                  max={256}
                  step={1}
                  onValueChange={(newValue) => {
                    updateGlyph(selectedCodepoint, { ...char, dwx0: newValue });
                  }}
                />
              </View>
              {/* <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}>
                <ThemedText>Advance height</ThemedText>
                <NumberInput
                  style={{ flex: 1 }}
                  value={char.dwy0 ?? font.headers.dwy0 ?? font.headers.fbby}
                  min={0}
                  max={256}
                  step={1}
                  onValueChange={(newValue) => {
                    updateGlyph(selectedCodepoint, { ...char, dwy0: newValue });
                  }}
                />
              </View> */}
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}>
                <ThemedText>X offset</ThemedText>
                <NumberInput
                  style={{ flex: 1 }}
                  value={char.bbxoff}
                  min={-256}
                  max={0}
                  step={1}
                  onValueChange={(newValue) => {
                    updateGlyph(selectedCodepoint, { ...char, bbxoff: newValue });
                  }}
                />
              </View>
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}>
                <ThemedText>Y offset</ThemedText>
                <NumberInput
                  style={{ flex: 1 }}
                  value={char.bbyoff}
                  min={-256}
                  max={0}
                  step={1}
                  onValueChange={(newValue) => {
                    updateGlyph(selectedCodepoint, { ...char, bbyoff: newValue });
                  }}
                />
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
