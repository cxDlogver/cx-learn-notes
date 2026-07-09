<script setup lang="ts">
import type { EditorAnalysis } from './editor-data';

defineProps<{
    analysis: EditorAnalysis;
}>();
</script>

<template>
    <aside
        class="flex min-h-0 flex-col overflow-hidden border-r border-[#262c36] bg-[var(--mg-panel)] px-3.5 py-4"
    >
        <div
            class="text-center font-mono text-xs font-semibold text-[var(--mg-text-dim)]"
        >
            2026.07.04&nbsp;&nbsp;15:42
        </div>

        <section
            class="mt-3 rounded-lg border border-[var(--mg-border)] bg-[#151a23] p-3"
        >
            <div class="flex items-start gap-2">
                <span class="text-lg text-[var(--mg-accent)]" aria-hidden="true"
                    >✦</span
                >
                <div>
                    <h2 class="text-sm font-semibold text-[var(--mg-text)]">
                        {{ analysis.title }}
                    </h2>
                    <p
                        class="mt-3 text-xs font-medium leading-5 text-[var(--mg-text-muted)]"
                    >
                        {{ analysis.summary }}
                    </p>
                    <div class="mt-3 flex gap-2">
                        <span
                            class="rounded border border-[#2f3744] bg-[#111722] px-2 py-1 font-mono text-[11px] text-[var(--mg-text-muted)]"
                        >
                            {{ analysis.segment }}
                        </span>
                        <span
                            class="rounded border border-[#2f3744] bg-[#111722] px-2 py-1 text-[11px] text-[var(--mg-text)]"
                        >
                            {{ analysis.priority }}
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <section class="mt-3">
            <div class="mb-2 flex items-center justify-between">
                <h3 class="text-xs font-semibold text-[var(--mg-text-dim)]">
                    识别标签
                </h3>
                <span class="text-[11px] text-[var(--mg-text-dim)]"
                    >自动匹配</span
                >
            </div>
            <div class="flex flex-wrap gap-2">
                <span
                    v-for="tag in analysis.tags"
                    :key="tag"
                    class="rounded-full border border-[#304052] bg-[#182231] px-2.5 py-1 text-[11px] font-semibold text-[var(--mg-text)]"
                >
                    <span class="mr-1 text-[var(--mg-accent-2)]">•</span
                    >{{ tag }}
                </span>
            </div>
        </section>

        <section
            class="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--mg-border)] bg-[#111722]"
        >
            <div
                class="flex items-center justify-between border-b border-[#222936] px-3 py-3"
            >
                <h3
                    class="flex items-center gap-2 text-sm font-semibold text-[var(--mg-text)]"
                >
                    <span class="text-[var(--mg-accent-2)]">▤</span>
                    智能分析
                </h3>
                <span
                    class="rounded border border-[#283241] px-2 py-1 font-mono text-[11px] text-[var(--mg-text-muted)]"
                >
                    00:00-00:14
                </span>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <p
                    v-for="paragraph in analysis.insight"
                    :key="paragraph"
                    class="mb-4 text-xs font-medium leading-5 text-[var(--mg-text-muted)]"
                >
                    {{ paragraph }}
                </p>
                <dl class="grid grid-cols-3 rounded border border-[#253040]">
                    <div
                        v-for="metric in analysis.metrics"
                        :key="metric.label"
                        class="p-2"
                    >
                        <dt class="text-[10px] text-[var(--mg-text-dim)]">
                            {{ metric.label }}
                        </dt>
                        <dd
                            class="mt-1 text-[11px] font-bold text-[var(--mg-text)]"
                        >
                            {{ metric.value }}
                        </dd>
                    </div>
                </dl>
            </div>
        </section>

        <button
            class="mx-auto mt-4 h-8 w-28 rounded-full border border-[#354052] bg-[#202733] text-xs font-semibold text-[var(--mg-text-muted)] transition hover:text-[var(--mg-text)]"
            title="滚动到分析底部"
            type="button"
        >
            ↓ 回到底部
        </button>

        <form
            class="mt-4 flex items-center gap-2 rounded-lg border border-[var(--mg-border)] bg-[#111722] p-2"
        >
            <div
                class="flex h-8 flex-1 items-center rounded-md border border-[#263041] bg-[#0c1119] px-3 text-xs text-[var(--mg-text-muted)]"
            >
                快捷调整：更短、更燃、字幕更大
            </div>
            <button
                class="flex h-9 w-10 items-center justify-center rounded-lg bg-[var(--mg-accent-2)] text-base font-bold text-white transition hover:brightness-110"
                title="发送快捷调整"
                type="button"
            >
                ▷
            </button>
        </form>
    </aside>
</template>
