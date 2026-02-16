import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, View, ViewProps } from "react-native";
import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type CustomStatusBarProps = {
} & ViewProps & BottomTabBarProps;

export function CustomStatusBar({
  style,
  state,
  descriptors,
  navigation,
  insets,
  ...props
}: CustomStatusBarProps) {
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "borderDefault");
  const colorNormal = useThemeColor({}, "text");
  const colorDisabled = useThemeColor({}, "textDisabled");

  return <View
    style={{
      width: "100%",
      backgroundColor,
      borderTopWidth: 1,
      borderColor,
      paddingBottom: insets.bottom,
      paddingTop: 10,
    }}
    {...props}
  >
    <View style={[
      {
        flexDirection: "row",
        marginHorizontal: "auto",
        gap: 50,
      },
      style,
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? colorNormal : colorDisabled;

        return <Pressable
          key={route.key}
          style={{
            alignItems: "center",
            width: 50,
          }}
          onPress={() => navigation.navigate(route.name)}
        >
          {options.tabBarIcon?.({ color, size: 28, focused: isFocused })}
          <ThemedText
            style={{
              fontSize: 10,
              color,
            }}
          >{options.title}</ThemedText>
        </Pressable>;
      })}
    </View>
  </View>;
}
