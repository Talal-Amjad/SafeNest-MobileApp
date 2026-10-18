import Constants from "expo-constants";
import { useState } from "react";
import { API_URL } from "@/api/config";
import { Body, Button, Card, Label, Screen } from "@/components/ui";
import { useSession } from "@/state/session";

export default function Settings() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const me = session.status === "parent" ? session.me : null;

  return (
    <Screen>
      <Card>
        <Label>Signed in as</Label>
        <Body>{me?.user.full_name}</Body>
        <Body muted>{me?.user.email}</Body>
      </Card>
      <Button
        title="Sign out"
        variant="secondary"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          await session.signOut();
        }}
      />
      <Body muted style={{ fontSize: 12, textAlign: "center" }}>
        SafeNest {Constants.expoConfig?.version} · {API_URL.replace(/^https?:\/\//, "")}
      </Body>
    </Screen>
  );
}
