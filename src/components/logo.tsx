import { Image } from "react-native";

/** SafeNest mark (rendered from assets/brand/mark.svg). */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/splash-icon.png")}
      style={{ width: size, height: size }}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}
