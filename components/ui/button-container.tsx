import { useThemeColor } from "@/hooks/use-theme-color";
import { Pressable, PressableProps } from "react-native";

export function ButtonContainer({ children, onPress, style, ...props }: PressableProps) {
  const backgroundColor = useThemeColor({}, "background");
  const backgroundColorHover = useThemeColor({}, "backgroundHover");
  const backgroundColorActive = useThemeColor({}, "backgroundActive");
  const borderColor = useThemeColor({}, "borderDefault");

  return (
    <Pressable
      style={state => [
        {
          borderWidth: 1,
          borderRadius: 10,
          borderColor,
          backgroundColor: state.pressed
            ? backgroundColorActive
            : state.hovered
              ? backgroundColorHover
              : backgroundColor,
          padding: 10,
          alignItems: "center",
        },
        typeof style === "function" ? style(state) : style,
      ]}
      onPress={onPress}
      {...props}
    >
      {children}
    </Pressable>
  );
}
