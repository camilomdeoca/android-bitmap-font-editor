import { Pressable, View } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { CharacterEditor } from "@/components/character-editor";
import { useFontStore } from "@/hooks/use-font-store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Font } from "@/lib/bdfparser";
import { useShallow } from "zustand/shallow";
import { glyph, serializeToBDF } from "@/lib/bdfparser/bdfparser";

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

  const {
    font,
    char,
  } = useFontStore(useShallow(state => {
    const b = state.font && glyph(state.font, "a");
    if (state.font !== undefined && b === undefined) throw new Error(`Font does not have char: "a"`);
    return {
      font: state.font,
      char: state.font && glyph(state.font, "a"),
    };
  }));
  const setFont = useFontStore(state => state.setFont);

  const handleCharChange = (hexdata: string[]) => {
    if (!char || !font) return;
    const ret = "a".codePointAt(0);
    if (ret === undefined) throw new Error(`Invalid character.`);
    const b = font.glyphs.get(ret);
    if (!b) throw new Error(`Font does not have char: ...`);
    b.hexdata = hexdata;

    const newFont = Object.assign(
      Object.create(Object.getPrototypeOf(font)),
      font
    );
    setFont(newFont);
  };

  return (
    <View
      style={{
        backgroundColor,
        flex: 1,
        padding: 20,
        gap: 10,
      }}
    >
      {char && <CharacterEditor char={char.hexdata} width={char.bbw} onChange={handleCharChange} />}
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
