import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { isUnauthorized } from "@/api";
import { SessionProvider } from "@/state/session";
import { usePalette } from "@/theme";

export default function RootLayout() {
  const c = usePalette();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: (count, err) => !isUnauthorized(err) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.surface },
            headerTintColor: c.foreground,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
          <Stack.Screen name="(parent)" options={{ headerShown: false }} />
          <Stack.Screen name="child" options={{ title: "SafeNest" }} />
          <Stack.Screen name="child-privacy" options={{ title: "Privacy" }} />
          <Stack.Screen name="add-device" options={{ title: "Add device", presentation: "modal" }} />
        </Stack>
      </SessionProvider>
    </QueryClientProvider>
  );
}
