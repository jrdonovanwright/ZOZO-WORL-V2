import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { colors, MIN_TAP_TARGET, radius, typography } from "@/theme";

type Variant = "primary" | "secondary" | "ghost";
type Size = "large" | "medium";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { background: string; text: string; border?: string }> = {
  primary: { background: colors.sunflower, text: colors.softBlack },
  secondary: { background: colors.cream, text: colors.softBlack, border: colors.charcoal },
  ghost: { background: "transparent", text: colors.charcoal },
};

export function Button({
  label,
  variant = "primary",
  size = "large",
  loading = false,
  disabled = false,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const vs = variantStyles[variant];
  const isLarge = size === "large";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: vs.background,
          borderWidth: vs.border ? 2 : 0,
          borderColor: vs.border ?? "transparent",
          minHeight: isLarge ? MIN_TAP_TARGET : 44,
          paddingHorizontal: isLarge ? 32 : 20,
          opacity: pressed || disabled ? 0.6 : 1,
          alignSelf: fullWidth ? "stretch" : "center",
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} />
      ) : (
        <Text
          style={[
            isLarge ? typography.body : typography.parentBody,
            { color: vs.text, fontWeight: "700" },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
