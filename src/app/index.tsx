import { Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LogoMark } from "@/components/logo";
import { Body, Button, Card, Loading, Notice } from "@/components/ui";
import { useSession } from "@/state/session";
import { space, usePalette } from "@/theme";

/** Entry point: route by role, or ask which role this phone plays. */
export default function Start() {
  const session = useSession();
  const c = usePalette();

  if (session.status === "loading") return <Loading />;
  if (session.status === "parent") return <Redirect href="/(parent)/home" />;
  if (session.status === "parent-signed-out") return <Redirect href="/sign-in" />;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.hero}>
        <LogoMark size={64} />
        <Text style={[styles.brand, { color: c.foreground }]}>SafeNest</Text>
        <Body muted style={styles.center}>
          Calm, honest parental controls. Who will use this phone?
        </Body>
      </View>

      <Card>
        <Text style={[styles.cardTitle, { color: c.foreground }]}>I&apos;m a parent</Text>
        <Body muted>See your children&apos;s devices, review blocked sites and change rules.</Body>
        <Button title="Continue as a parent" onPress={() => session.chooseRole("parent")} />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: c.foreground }]}>This is my child&apos;s phone</Text>
        <Body muted>Link this phone to your child&apos;s profile with a code from the dashboard.</Body>
        {session.status === "child" ? (
          <Notice tone="neutral">Linking a child&apos;s phone arrives in the next update.</Notice>
        ) : (
          <Button title="Set up a child's phone" variant="secondary" onPress={() => session.chooseRole("child")} />
        )}
        {session.status === "child" && (
          <Button title="Choose again" variant="secondary" onPress={session.resetRole} />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space(5), justifyContent: "center", gap: space(4) },
  hero: { alignItems: "center", gap: space(2), marginBottom: space(4) },
  brand: { fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  center: { textAlign: "center" },
  cardTitle: { fontSize: 18, fontWeight: "600" },
});
