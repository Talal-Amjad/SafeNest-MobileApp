import { useColorScheme } from "react-native";
import { dark, light, type Palette } from "./tokens";

export * from "./tokens";

/** The palette for the system light/dark setting. */
export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
