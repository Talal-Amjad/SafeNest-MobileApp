import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { errorMessage, parentApi, type Child, type Rule, type RuleAction } from "@/api";
import { Badge, Body, Button, Card, Chip, Field, Label, Loading, Notice, Screen } from "@/components/ui";
import { space, usePalette } from "@/theme";

export default function Rules() {
  const c = usePalette();
  const rules = useQuery({ queryKey: ["rules"], queryFn: parentApi.rules });
  const children = useQuery({ queryKey: ["children"], queryFn: parentApi.children });
  if (rules.isPending || children.isPending) return <Loading />;

  const kids = children.data ?? [];
  const names = new Map(kids.map((k) => [k.id, k.display_name]));
  const list = [...(rules.data ?? [])].sort((a, b) => a.value.localeCompare(b.value));

  return (
    <Screen
      refresh={
        <RefreshControl
          refreshing={rules.isRefetching}
          onRefresh={() => {
            rules.refetch();
            children.refetch();
          }}
          tintColor={c.primary}
        />
      }
    >
      {(rules.error || children.error) && <Notice tone="danger">{errorMessage(rules.error ?? children.error)}</Notice>}
      {kids.length > 0 && <AddRule kids={kids} />}
      <Label>Your rules</Label>
      <Body muted style={{ fontSize: 13 }}>
        A website rule covers the site and its subdomains. When rules overlap, the most specific one wins.
      </Body>
      {list.length === 0 && <Body muted>No rules yet. Sites with no rule are allowed.</Body>}
      {list.map((r) => (
        <RuleRow key={r.id} rule={r} names={names} />
      ))}
    </Screen>
  );
}

function AddRule({ kids }: { kids: Child[] }) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [action, setAction] = useState<RuleAction>("block");
  const [selected, setSelected] = useState<string[]>(kids.length === 1 ? [kids[0].id] : []);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      parentApi.createRule({ kind: "domain", value: value.trim(), action, child_ids: selected, is_active: true }),
    onSuccess: () => {
      setValue("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["rules"] });
      qc.invalidateQueries({ queryKey: ["children"] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function submit() {
    if (!value.trim()) return setError("Enter a website, like tiktok.com.");
    if (selected.length === 0) return setError("Choose who this rule is for.");
    create.mutate();
  }

  return (
    <Card>
      <Field
        label="Website"
        placeholder="tiktok.com"
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint="Paste a full link if that's easier; SafeNest keeps just the site."
      />
      <Label>Action</Label>
      <View style={styles.chips}>
        <Chip label="Block" selected={action === "block"} onPress={() => setAction("block")} />
        <Chip label="Allow" selected={action === "allow"} onPress={() => setAction("allow")} />
      </View>
      <Label>For</Label>
      <View style={styles.chips}>
        {kids.map((k) => (
          <Chip key={k.id} label={k.display_name} selected={selected.includes(k.id)} onPress={() => toggle(k.id)} />
        ))}
      </View>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button title={create.isPending ? "Saving…" : "Add rule"} onPress={submit} busy={create.isPending} />
    </Card>
  );
}

function RuleRow({ rule, names }: { rule: Rule; names: Map<string, string> }) {
  const c = usePalette();
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => parentApi.deleteRule(rule.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
    onError: (err) => Alert.alert("Couldn't delete the rule", errorMessage(err)),
  });
  const who = rule.child_ids.map((id) => names.get(id)).filter(Boolean).join(", ") || "No one yet";

  function confirm() {
    Alert.alert(`Delete the rule for ${rule.value}?`, "Devices stop applying it at their next sync.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
    ]);
  }

  return (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, opacity: remove.isPending ? 0.5 : 1 }]}>
      <View style={{ flex: 1, gap: space(1) }}>
        <Text style={[styles.value, { color: c.foreground }]} numberOfLines={1}>
          {rule.value}
        </Text>
        <Body muted style={{ fontSize: 13 }}>
          {who}
        </Body>
        <View style={styles.chips}>
          <Badge tone={rule.action === "block" ? "danger" : "ok"}>{rule.action === "block" ? "Blocked" : "Allowed"}</Badge>
          {!rule.is_active && <Badge tone="neutral">Paused</Badge>}
          {!rule.enforceable && <Badge tone="warn">Not enforced yet</Badge>}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete rule for ${rule.value}`} onPress={confirm} hitSlop={12}>
        <Text style={{ color: c.danger, fontWeight: "600" }}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space(3),
  },
  value: { fontSize: 16, fontWeight: "600" },
});
