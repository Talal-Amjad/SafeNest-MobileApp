import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { usePalette } from "@/theme";

export default function RootLayout() {
  const c = usePalette();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.foreground,
          contentStyle: { backgroundColor: c.background },
        }}
      />
    </>
  );
}
