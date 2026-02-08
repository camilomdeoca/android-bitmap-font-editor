import { TextInput, TextInputProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

export function ThemedTextInput({ 
  style, 
  ...props 
}: TextInputProps) {
  const color = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borderDefault");

  return (
    <TextInput
      style={[
        {
          color,
          borderColor,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 10,
        },
        style
      ]}
      {...props}
    />
  );
}
