import { View, Modal, Pressable, FlatList, TextProps } from "react-native";
import { useMemo, useState } from "react";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { PressableProps } from "react-native/Libraries/Components/Pressable/Pressable";
import { ThemedTextInput } from "./themed-text-input";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

export type SelectParams = {
  value: number | undefined;
  onValueChange: (value: number) => void;
  options: string[];
  optionTextStyle: TextProps["style"];
  filterable?: boolean,
  placeholder?: string,
} & Omit<PressableProps, "onPress" | "children">;

/**
 * Select component for choosing from a list of options with modal interface and optional filtering.
 */
export function Select({
  value,
  onValueChange,
  options,
  style,
  optionTextStyle,
  filterable = false,
  placeholder = "",
  ...params
}: SelectParams) {
  const [modalVisible, setModalVisible] = useState(false);
  
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "borderDefault");
  const textColor = useThemeColor({}, "text");
  const textColorDisabled = useThemeColor({}, "textDisabled");
  const backgroundColorActive = useThemeColor({}, "backgroundActive");

  const selectedOption = value !== undefined && value >= 0 && value < options.length 
    ? options[value] 
    : placeholder;

  const handleOptionPress = (index: number) => {
    onValueChange(index);
    setModalVisible(false);
  };

  const [filter, setFilter] = useState("");

  const filteredOptions = useMemo(
    () => options.flatMap((option, index) => {
      return option.toLowerCase().includes(filter.toLowerCase())
        ? [{ index, option }]
        : []
    }),
    [filter, options],
  );

  const keyboardHeight = useKeyboardHeight();

  return <>
    <Pressable
      style={state => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor,
          width: "100%",
        },
        typeof style === "function" ? style(state) : style,
      ]}
      onPress={() => setModalVisible(true)}
      {...params}
    >
      <ThemedText style={[
        { flex: 1, color: value ? textColor : textColorDisabled },
        optionTextStyle,
      ]}>
        {selectedOption}
      </ThemedText>
      <IconSymbol name="chevron.down" color={textColor} size={24} />
    </Pressable>

    <Modal
      animationType="slide"
      visible={modalVisible}
      transparent
    >
      <SafeAreaView
        edges={["bottom", "right", "left"]}
        style={{ flex: 1 }}
      >
        <View style={{
          flex: 1,
          flexDirection: "column",
          marginBottom: keyboardHeight,
        }}>
          <Pressable 
            style={{ flex: 1 }} 
            onPress={() => setModalVisible(false)} 
          />
          <View style={{
            flexDirection: "column",
            backgroundColor,
            width: "100%",
            bottom: 0,
            borderTopRightRadius: 10,
            borderTopLeftRadius: 10,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor,
            padding: 10,
            gap: 5,
            flex: 3,
          }}>
            {filterable && <ThemedTextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Search..."
            />}
            <FlatList
              style={{
                flexDirection: "column",
                backgroundColor,
                width: "100%",
                gap: 5,
                flex: 1,
              }}
              data={filteredOptions}
              renderItem={({ item }) => (
                <Pressable
                  key={item.option}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: value === item.index ? backgroundColorActive : "transparent",
                  }}
                  onPress={() => handleOptionPress(item.index)}
                >
                  <ThemedText style={optionTextStyle}>{item.option}</ThemedText>
                </Pressable>
              )}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
