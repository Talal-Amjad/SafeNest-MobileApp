import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { Loading } from "@/components/ui";
import { useSession } from "@/state/session";
import { usePalette } from "@/theme";

const ICONS: Record<string, string> = { home: "⌂", activity: "◷", rules: "⛉", settings: "⚙" };

/** Parent area: only reachable while signed in. */
export default function ParentLayout() {
  const session = useSession();
  const c = usePalette();
  if (session.status === "loading") return <Loading />;
  if (session.status !== "parent") return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.foreground,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }} accessible={false}>
            {ICONS[route.name] ?? "•"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
