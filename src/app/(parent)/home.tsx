import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { errorMessage, parentApi, type Device } from "@/api";
import { Badge, Body, Button, Card, Loading, Notice, Screen, Title } from "@/components/ui";
import { connectionBadge, PLATFORM_LABEL, policyBadge, summarize, timeAgo } from "@/lib/status";
import { useSession } from "@/state/session";
import { space, usePalette } from "@/theme";

export default function Home() {
  const session = useSession();
  const c = usePalette();
  const children = useQuery({ queryKey: ["children"], queryFn: parentApi.children });
  const devices = useQuery({ queryKey: ["devices"], queryFn: parentApi.devices, refetchInterval: 30_000 });

  const name = session.status === "parent" ? session.me.user.full_name.split(" ")[0] : "";
  if (children.isPending || devices.isPending) return <Loading />;

  const refreshing = children.isRefetching || devices.isRefetching;
  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        children.refetch();
        devices.refetch();
      }}
      tintColor={c.primary}
    />
  );
  const error = children.error ?? devices.error;
  const summaries = summarize(children.data ?? [], devices.data ?? []);
  const attention = summaries.reduce((n, s) => n + s.attention, 0);

  return (
    <Screen refresh={refresh}>
      <Title>Hi {name || "there"}</Title>
      {error && <Notice tone="danger">{errorMessage(error)}</Notice>}
      {!error && summaries.length > 0 && (
        <Notice tone={attention ? "warn" : "ok"}>
          {attention
            ? `${attention} device${attention === 1 ? " needs" : "s need"} attention.`
            : "All linked devices are online with your latest rules."}
        </Notice>
      )}
      {summaries.length === 0 && !error && (
        <Card>
          <Body>Add a child profile on the SafeNest website to get started.</Body>
        </Card>
      )}
      {summaries.length > 0 && <Button title="Add a device" onPress={() => router.push("/add-device")} />}
      {summaries.map(({ child, devices: list }) => (
        <Card key={child.id}>
          <Text style={[styles.child, { color: c.foreground }]}>{child.display_name}</Text>
          {list.length === 0 ? (
            <Body muted>No devices linked yet.</Body>
          ) : (
            list.map((d) => <DeviceRow key={d.id} device={d} />)
          )}
        </Card>
      ))}
    </Screen>
  );
}

function DeviceRow({ device }: { device: Device }) {
  const c = usePalette();
  const conn = connectionBadge(device);
  const policy = policyBadge(device);
  return (
    <View style={[styles.row, { borderTopColor: c.border }]} accessible accessibilityLabel={`${device.name}, ${conn.label}${policy ? `, ${policy.label}` : ""}`}>
      <Text style={[styles.deviceName, { color: c.foreground }]}>{device.name}</Text>
      <Body muted style={styles.meta}>
        {PLATFORM_LABEL[device.platform]} · last seen {timeAgo(device.last_seen_at)}
      </Body>
      <View style={styles.badges}>
        <Badge tone={conn.tone}>{conn.label}</Badge>
        {policy && <Badge tone={policy.tone}>{policy.label}</Badge>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  child: { fontSize: 18, fontWeight: "600" },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space(3), marginTop: space(1), gap: space(1) },
  deviceName: { fontSize: 16, fontWeight: "500" },
  meta: { fontSize: 13 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space(2), marginTop: space(1) },
});
