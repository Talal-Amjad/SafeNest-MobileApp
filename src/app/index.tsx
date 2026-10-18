import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { space, usePalette } from "@/theme";

// Placeholder until the parent and child flows land (tasks 3 and 7).
export default function Home() {
  const c = usePalette();
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: "SafeNest" }} />
      <Text style={[styles.title, { color: c.foreground }]}>SafeNest</Text>
      <Text style={{ color: c.mutedForeground }}>Calm, honest parental controls.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(2) },
  title: { fontSize: 28, fontWeight: "700" },
});
