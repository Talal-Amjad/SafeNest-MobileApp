import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, RefreshControl, Switch, View } from "react-native";
import { vpn } from "../../modules/safenest-vpn";
import { errorMessage, type Policy } from "@/api";
import { Badge, Body, Button, Card, Field, Label, Loading, Notice, Screen, Title } from "@/components/ui";
import { formatCode, isCompleteCode } from "@/lib/code";
import { timeAgo } from "@/lib/status";
import { checkIn, defaultDeviceName, domainRules, ENFORCEMENT_UNAVAILABLE, linkDevice, loadDevice } from "@/state/device";
import { useSession } from "@/state/session";
import { usePalette } from "@/theme";

/** The child's phone: link with a code, then show what applies here. */
export default function ChildHome() {
  const session = useSession();
  const device = useQuery({ queryKey: ["device"], queryFn: loadDevice });
  const [removed, setRemoved] = useState(false);

  if (session.status !== "child") return <Redirect href="/" />;
  if (device.isPending) return <Loading />;
  if (!device.data) {
    return (
      <LinkPhone
        removed={removed}
        onLinked={() => {
          setRemoved(false);
          device.refetch();
        }}
      />
    );
  }
  return (
    <LinkedStatus
      onRemoved={() => {
        setRemoved(true);
        device.refetch();
      }}
    />
  );
}

function LinkPhone({ removed, onLinked }: { removed: boolean; onLinked: () => void }) {
  const session = useSession();
  const [code, setCode] = useState("");
  const [name, setName] = useState(defaultDeviceName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!isCompleteCode(code)) {
      setError("Enter the 10-character code from the SafeNest dashboard, like ABCDE-FGHJK.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await linkDevice(code, name);
      onLinked();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Link this phone</Title>
      {removed && <Notice tone="warn">A parent removed this phone from SafeNest. Link it again with a new code.</Notice>}
      <Body muted>
        The parent who manages SafeNest links this phone to a child&apos;s profile: in the dashboard, open Devices, choose
        Add device and pick the child. Codes expire after 15 minutes.
      </Body>
      <Field
        label="Link code"
        value={code}
        onChangeText={(t) => setCode(formatCode(t))}
        placeholder="ABCDE-FGHJK"
        autoCapitalize="characters"
        autoCorrect={false}
        style={{ fontSize: 22, letterSpacing: 3 }}
      />
      <Field label="Phone name" value={name} onChangeText={setName} maxLength={100} hint="Shown to the parent in the dashboard." />
      {error && <Notice tone="danger">{error}</Notice>}
      <Button title={busy ? "Linking…" : "Link phone"} onPress={submit} busy={busy} />
      <Button title="What SafeNest does on this phone" variant="secondary" onPress={() => router.push("/child-privacy")} />
      <Button title="I'm a parent instead" variant="secondary" onPress={session.resetRole} />
    </Screen>
  );
}

const CHECK_IN_MS = 60_000;

function LinkedStatus({ onRemoved }: { onRemoved: () => void }) {
  const c = usePalette();
  const state = useQuery({ queryKey: ["device"], queryFn: loadDevice });
  const sync = useQuery({
    queryKey: ["check-in", state.data?.deviceId],
    queryFn: () => checkIn(state.data!),
    enabled: !!state.data,
    refetchInterval: CHECK_IN_MS,
  });

  // Check in when the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && sync.refetch());
    return () => sub.remove();
  }, [sync]);

  useEffect(() => {
    if (sync.data?.kind === "removed") onRemoved();
  }, [sync.data, onRemoved]);

  const s = state.data;
  if (!s) return <Loading />;
  const result = sync.data;
  const blocked = result?.kind === "ok" ? result.policy.rules.filter((r) => r.kind === "domain" && r.action === "block") : [];

  return (
    <Screen refresh={<RefreshControl refreshing={sync.isFetching} onRefresh={() => void sync.refetch()} tintColor={c.primary} />}>
      <Title>Linked to {s.childName}</Title>
      {vpn.isSupported() ? (
        <Protection policy={result?.kind === "ok" ? result.policy : null} onChange={() => void sync.refetch()} />
      ) : (
        <Notice tone="warn">
          {ENFORCEMENT_UNAVAILABLE} The parent can see this phone in the dashboard, and blocking arrives in an update.
        </Notice>
      )}
      <Card>
        <Label>Connection</Label>
        {result?.kind === "ok" && (
          <>
            <Badge tone="ok">Connected</Badge>
            <Body muted>Last check-in {timeAgo(result.at)}</Body>
          </>
        )}
        {result?.kind === "error" && <Notice tone="danger">{errorMessage(result.error)}</Notice>}
        {!result && <Body muted>Checking in…</Body>}
      </Card>
      {result?.kind === "ok" && (
        <Card>
          <Label>Sites {s.childName}&apos;s parent has blocked</Label>
          {blocked.length === 0 ? (
            <Body muted>None right now.</Body>
          ) : (
            blocked.map((r) => <Body key={r.id}>{r.value}</Body>)
          )}
        </Card>
      )}
      <Button title="What SafeNest does on this phone" variant="secondary" onPress={() => router.push("/child-privacy")} />
      <Body muted style={{ fontSize: 13 }}>
        To stop using SafeNest on this phone, the parent removes it under Devices in the dashboard.
      </Body>
    </Screen>
  );
}

/** Android only: the on-device website filter (a local VPN that carries only DNS). */
function Protection({ policy, onChange }: { policy: Policy | null; onChange: () => void }) {
  const c = usePalette();
  const [on, setOn] = useState(vpn.isRunning());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (next) {
        if (!policy) throw new Error("Waiting for the rules from SafeNest. Try again in a moment.");
        if (!(await vpn.prepare())) throw new Error("Android needs your permission to start SafeNest's filter.");
        await vpn.start(domainRules(policy));
      } else {
        await vpn.stop();
      }
      setOn(next);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label>Website blocking</Label>
        <Switch value={on} onValueChange={toggle} disabled={busy} trackColor={{ true: c.primary }} accessibilityLabel="Website blocking" />
      </View>
      <Body muted>
        {on
          ? "On: the parent's rules apply in every app on this phone. A key icon shows in the status bar."
          : "Off: nothing is blocked on this phone. Turning it on asks Android for VPN permission; SafeNest uses it only to check website names."}
      </Body>
      {error && <Notice tone="danger">{error}</Notice>}
    </Card>
  );
}
