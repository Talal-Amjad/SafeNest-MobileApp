import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { errorMessage, parentApi, type ActivityEvent } from "@/api";
import { Body, Chip, Loading, Notice } from "@/components/ui";
import { timeAgo } from "@/lib/status";
import { space, usePalette } from "@/theme";

/** Blocked attempts reported by the children's devices, newest first. */
export default function Activity() {
  const c = usePalette();
  const [childId, setChildId] = useState<string | undefined>();
  const children = useQuery({ queryKey: ["children"], queryFn: parentApi.children });
  const feed = useInfiniteQuery({
    queryKey: ["activity", childId ?? "all"],
    queryFn: ({ pageParam }) => parentApi.activity(pageParam, childId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

  if (feed.isPending) return <Loading />;
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <EventRow event={item} />}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} tintColor={c.primary} />}
      ListHeaderComponent={
        <View style={{ gap: space(3), marginBottom: space(2) }}>
          {(children.data?.length ?? 0) > 1 && (
            <View style={styles.chips}>
              <Chip label="Everyone" selected={!childId} onPress={() => setChildId(undefined)} />
              {children.data?.map((ch) => (
                <Chip key={ch.id} label={ch.display_name} selected={childId === ch.id} onPress={() => setChildId(ch.id)} />
              ))}
            </View>
          )}
          {feed.error && <Notice tone="danger">{errorMessage(feed.error)}</Notice>}
        </View>
      }
      ListEmptyComponent={
        feed.error ? undefined : (
          <Body muted style={{ textAlign: "center", marginTop: space(8) }}>
            No blocked attempts yet. When a linked device blocks a site under your rules, it shows up here.
          </Body>
        )
      }
    />
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const c = usePalette();
  return (
    <View
      style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
      accessible
      accessibilityLabel={`${event.domain} blocked on ${event.child_name}'s ${event.device_name}, ${timeAgo(event.occurred_at)}`}
    >
      <View style={styles.rowTop}>
        <Text style={[styles.domain, { color: c.foreground }]} numberOfLines={1}>
          {event.domain}
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{timeAgo(event.occurred_at)}</Text>
      </View>
      <Body muted style={styles.meta}>
        Blocked on {event.child_name}&apos;s {event.device_name}
        {event.rule_value ? ` · rule: ${event.rule_value}` : ""}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: space(5), gap: space(2), paddingBottom: space(10) },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: space(3), gap: space(1) },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space(2) },
  domain: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  meta: { fontSize: 13 },
});
