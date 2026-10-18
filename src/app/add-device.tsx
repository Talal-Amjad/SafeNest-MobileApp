import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { errorMessage, parentApi, type EnrollmentCreated } from "@/api";
import { Body, Button, Card, Chip, Label, Loading, Notice, Screen, Title } from "@/components/ui";
import { countdown } from "@/lib/code";
import { useSession } from "@/state/session";
import { space, usePalette } from "@/theme";

/** Generate a one-time code for a child's device and wait for it to be used. */
export default function AddDevice() {
  const c = usePalette();
  const session = useSession();
  const qc = useQueryClient();
  const children = useQuery({ queryKey: ["children"], queryFn: parentApi.children });
  const [childId, setChildId] = useState<string | null>(null);
  const [code, setCode] = useState<EnrollmentCreated | null>(null);
  const [now, setNow] = useState(() => new Date());

  const create = useMutation({
    mutationFn: (id: string) => parentApi.createEnrollment(id),
    onSuccess: setCode,
  });

  // Poll while a code is pending; the server marks it "used" once a device links.
  const status = useQuery({
    queryKey: ["enrollments", code?.id],
    queryFn: parentApi.enrollments,
    enabled: !!code,
    refetchInterval: 3000,
    select: (list) => list.find((e) => e.id === code?.id)?.status ?? "pending",
  });
  const used = status.data === "used";

  useEffect(() => {
    if (!code || used) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [code, used]);

  useEffect(() => {
    if (used) qc.invalidateQueries({ queryKey: ["devices"] });
  }, [used, qc]);

  if (session.status !== "parent") return <Redirect href="/" />;
  if (children.isPending) return <Loading />;
  const kids = children.data ?? [];
  const selected = childId ?? (kids.length === 1 ? kids[0].id : null);
  const child = kids.find((k) => k.id === (code?.child_id ?? selected));
  const left = code ? countdown(code.expires_at, now) : null;

  if (used) {
    return (
      <Screen>
        <Title>Linked</Title>
        <Notice tone="ok">
          The device is now linked to {child?.display_name}. It downloads their rules and appears on your Home tab.
        </Notice>
        <Button title="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (code) {
    return (
      <Screen>
        <Title>Code for {child?.display_name}</Title>
        <Card style={{ alignItems: "center", paddingVertical: space(6) }}>
          <Text
            selectable
            accessibilityLabel={`Code ${code.code.split("").join(" ")}`}
            style={[styles.code, { color: left ? c.foreground : c.mutedForeground }, !left && styles.struck]}
          >
            {code.code}
          </Text>
          <Body muted style={{ color: left ? c.mutedForeground : c.danger }}>
            {left ? `Expires in ${left} · works once` : "This code has expired."}
          </Body>
          {left && (
            <Button title="Copy code" variant="secondary" onPress={() => Clipboard.setStringAsync(code.code)} />
          )}
        </Card>
        <Card>
          <Body>1. On your child&apos;s device, open SafeNest.</Body>
          <Body>2. Choose to set up a child&apos;s device (on Windows, the window opens on the code screen).</Body>
          <Body>3. Enter the code. This screen updates as soon as the device is linked.</Body>
        </Card>
        {left ? (
          <Body muted style={{ textAlign: "center" }}>Waiting for the device…</Body>
        ) : (
          <Button title="Generate a new code" onPress={() => create.mutate(code.child_id)} busy={create.isPending} />
        )}
        <Button
          title="Cancel"
          variant="secondary"
          onPress={async () => {
            if (left) await parentApi.cancelEnrollment(code.id).catch(() => undefined);
            router.back();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Add a device</Title>
      {kids.length === 0 ? (
        <Notice tone="warn">Add a child profile on the SafeNest website first. Devices belong to a child.</Notice>
      ) : (
        <>
          <Label>Whose device is it?</Label>
          <View style={styles.chips}>
            {kids.map((k) => (
              <Chip key={k.id} label={k.display_name} selected={selected === k.id} onPress={() => setChildId(k.id)} />
            ))}
          </View>
          <Notice tone="neutral">
            The SafeNest app for Windows uses these codes today. Linking Android and iPhone devices is in development.
          </Notice>
          {create.error && <Notice tone="danger">{errorMessage(create.error)}</Notice>}
          <Button
            title="Generate code"
            disabled={!selected}
            busy={create.isPending}
            onPress={() => selected && create.mutate(selected)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 34, fontWeight: "700", letterSpacing: 4, fontVariant: ["tabular-nums"] },
  struck: { textDecorationLine: "line-through" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
});
