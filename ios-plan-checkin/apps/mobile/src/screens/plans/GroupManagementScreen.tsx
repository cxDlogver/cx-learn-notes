import { useLayoutEffect, useRef, useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { GroupDto } from "@plan-checkin/contracts";
import { useQuery } from "@tanstack/react-query";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useAppServices } from "../../data/services";
import type { RootStackParamList } from "../../navigation/navigation";
import {
  Choice,
  ErrorText,
  FormField,
  PlanInput,
  PlanScreen,
  planStyles,
  Submit,
} from "./ui";

export function GroupManagementScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const { repository, queryClient } = useAppServices();
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => repository.listGroups(),
  });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => repository.listPlans(),
  });
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<GroupDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          testID="plans.groups.new"
          accessibilityRole="button"
          onPress={() => {
            setEditing(null);
            setName("");
            scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          <Text style={{ color: "#236B4A", fontSize: 16 }}>新建</Text>
        </Pressable>
      ),
    });
  }, [navigation]);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
      queryClient.invalidateQueries({ queryKey: ["plans"] }),
    ]);
  };
  async function write(): Promise<void> {
    const clean = name.trim();
    if (!clean || clean.length > 40)
      return setError("分组名称需为 1–40 个字符");
    if (
      groups.data?.some(
        (group) => group.name === clean && group.id !== editing?.id,
      )
    )
      return setError("分组名称已存在");
    setSaving(true);
    setError(null);
    try {
      if (editing)
        await repository.updateGroup(editing.id, {
          name: clean,
          baseRevision: editing.revision,
        });
      else
        await repository.createGroup({
          name: clean,
          sortOrder:
            Math.max(
              0,
              ...(groups.data ?? []).map((group) => group.sortOrder),
            ) + 10,
        });
      setName("");
      setEditing(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请检查网络");
      await refresh();
    } finally {
      setSaving(false);
    }
  }
  async function move(group: GroupDto, offset: number): Promise<void> {
    const ordered = [...(groups.data ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const index = ordered.findIndex((item) => item.id === group.id);
    const other = ordered[index + offset];
    if (!other) return;
    setSaving(true);
    setError(null);
    try {
      const next = ordered.slice();
      next.splice(index, 1);
      next.splice(index + offset, 0, group);
      for (let position = 0; position < next.length; position++) {
        const current = next[position]!;
        const desired = (position + 1) * 10;
        if (current.sortOrder !== desired)
          await repository.updateGroup(current.id, {
            sortOrder: desired,
            baseRevision: current.revision,
          });
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "排序失败，请重试");
      await refresh();
    } finally {
      setSaving(false);
    }
  }
  function confirmDelete(group: GroupDto): void {
    Alert.alert(
      "删除分组？",
      `「${group.name}」内的计划将移至未分组，计划和记录仍保留。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "删除分组",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSaving(true);
              setError(null);
              try {
                await repository.deleteGroup(group.id, group.revision);
                await refresh();
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "删除失败，请重试",
                );
                await refresh();
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  }
  return (
    <PlanScreen scrollRef={scrollRef}>
      <Text testID="plans.groups.title" style={planStyles.title}>
        管理分组
      </Text>
      <Text style={planStyles.subtitle}>
        把相关计划放在一起。删除分组不会删除其中的计划。
      </Text>
      {groups.isPending ? (
        <Text style={planStyles.subtitle}>正在读取分组…</Text>
      ) : null}
      {groups.isError ? (
        <>
          <ErrorText message="分组读取失败" />
          <Choice
            testID="plans.groups.retry"
            label="重试"
            onPress={() => void groups.refetch()}
          />
        </>
      ) : null}
      {[...(groups.data ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((group, index, ordered) => (
          <View
            key={group.id}
            testID={`plans.groups.row-${group.id}`}
            style={planStyles.card}
          >
            <Text style={planStyles.cardTitle}>{group.name}</Text>
            <Text style={[planStyles.body, { marginTop: 5 }]}>
              {plans.data?.filter(
                (plan) =>
                  plan.groupId === group.id && plan.lifecycle !== "deleted",
              ).length ?? 0}{" "}
              项计划
            </Text>
            <View style={[planStyles.wrap, { marginTop: 12 }]}>
              <Choice
                testID={`plans.groups.edit-${group.id}`}
                label="编辑"
                onPress={() => {
                  setEditing(group);
                  setName(group.name);
                }}
              />
              <Choice
                testID={`plans.groups.up-${group.id}`}
                label="上移"
                onPress={() => void move(group, -1)}
              />
              <Choice
                testID={`plans.groups.down-${group.id}`}
                label="下移"
                onPress={() => void move(group, 1)}
              />
              <Choice
                testID={`plans.groups.delete-${group.id}`}
                label="删除"
                danger
                onPress={() => confirmDelete(group)}
              />
            </View>
            {index === 0 || index === ordered.length - 1 ? (
              <Text style={planStyles.subtitle}>
                {index === 0 ? "已在顶部" : "已在底部"}
              </Text>
            ) : null}
          </View>
        ))}
      <View testID="plans.groups.ungrouped" style={planStyles.card}>
        <Text style={planStyles.cardTitle}>未分组</Text>
        <Text style={planStyles.body}>
          {plans.data?.filter(
            (plan) => !plan.groupId && plan.lifecycle !== "deleted",
          ).length ?? 0}{" "}
          项计划
        </Text>
      </View>
      <FormField
        label={editing ? "编辑分组名称" : "新建分组"}
        testID="plans.groups.name-field"
      >
        <PlanInput
          testID="plans.groups.name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(null);
          }}
          placeholder="输入分组名称"
        />
      </FormField>
      {editing ? (
        <Choice
          testID="plans.groups.cancel-edit"
          label="取消编辑"
          onPress={() => {
            setEditing(null);
            setName("");
          }}
        />
      ) : null}
      <ErrorText message={error} />
      <Submit
        testID="plans.groups.save"
        label={editing ? "保存分组" : "添加分组"}
        onPress={() => void write()}
        pending={saving}
      />
      <Text style={planStyles.subtitle}>分组管理需要网络连接。</Text>
    </PlanScreen>
  );
}
