import { View, ViewProps } from "react-native";
import { ButtonContainer } from "./button-container";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "./icon-symbol";
import { ThemedText } from "../themed-text";

export type NumberInputParams = {
  value: number,
  onValueChange: (value: number) => void,
  min?: number,
  max?: number,
  step?: number,
  style: ViewProps["style"],
};

export function NumberInput({
  value,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  style,
}: NumberInputParams) {
  const color = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borderDefault");

  const onValueChangeValidated = (toValidateValue: number) => {
    if (toValidateValue >= min && toValidateValue <= max) {
      const newValue = Math.floor(toValidateValue / step) * step;
      onValueChange(newValue);
    }
  };

  return <View
    style={[
      { flexDirection: "row", gap: 5 },
      style,
    ]}
  >
    <ThemedText style={{
      borderWidth: 1,
      borderColor,
      borderRadius: 10,
      flexGrow: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    }}>
      {value}
    </ThemedText>
    <ButtonContainer onPress={() => onValueChangeValidated(value - step)}>
      <IconSymbol name="minus" color={color} size={19} />
    </ButtonContainer>
    <ButtonContainer onPress={() => onValueChangeValidated(value + step)}>
      <IconSymbol name="plus" color={color} size={19} />
    </ButtonContainer>
  </View>;
}
