import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { radius, space, usePalette, type Palette } from "@/theme";

export type Tone = "ok" | "warn" | "danger" | "neutral" | "brand";

export function toneColors(c: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case "ok":
      return { fg: c.success, bg: c.successSoft };
    case "warn":
      return { fg: c.warning, bg: c.warningSoft };
    case "danger":
      return { fg: c.danger, bg: c.dangerSoft };
    case "brand":
      return { fg: c.primary, bg: c.primarySoft };
    default:
      return { fg: c.mutedForeground, bg: c.surfaceMuted };
  }
}

/** Scrollable page body with consistent padding. */
export function Screen({ children, refresh }: { children: ReactNode; refresh?: ReactNode }) {
  const c = usePalette();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      refreshControl={refresh as never}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = usePalette();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.title, { color: c.foreground }]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const c = usePalette();
  return <Text style={[styles.body, { color: muted ? c.mutedForeground : c.foreground }, style]}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.label, { color: c.foreground }]}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", busy, disabled }: ButtonProps) {
  const c = usePalette();
  const off = disabled || busy;
  const bg = variant === "primary" ? c.primary : c.surface;
  const fg = variant === "primary" ? c.primaryForeground : variant === "danger" ? c.danger : c.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === "primary" ? bg : c.border, opacity: off ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {busy && <ActivityIndicator color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: space(1.5) }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={c.mutedForeground}
        {...input}
        style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.foreground }, input.style]}
      />
      {hint && <Body muted style={styles.small}>{hint}</Body>}
    </View>
  );
}

export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  const c = usePalette();
  const { fg, bg } = toneColors(c, tone);
  return (
    <View
      accessibilityRole={tone === "danger" || tone === "warn" ? "alert" : undefined}
      style={[styles.notice, { backgroundColor: bg, borderLeftColor: fg }]}
    >
      <Text style={[styles.body, { color: c.foreground }]}>{children}</Text>
    </View>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const c = usePalette();
  const { fg, bg } = toneColors(c, tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <ActivityIndicator color={c.primary} accessibilityLabel="Loading" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space(5), gap: space(4), paddingBottom: space(10) },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, padding: space(4), gap: space(2) },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: "600" },
  button: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: space(4),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space(2),
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(3), fontSize: 16 },
  notice: { borderRadius: radius.lg, borderLeftWidth: 4, padding: space(3) },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: space(2.5), paddingVertical: space(0.5) },
  badgeText: { fontSize: 12, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

/** Toggleable pill (filters, multi-select). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primarySoft : c.surface,
        borderRadius: 999,
        paddingHorizontal: space(3),
        paddingVertical: space(1.5),
      }}
    >
      <Text style={{ color: selected ? c.primary : c.foreground, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}
