<script setup lang="ts">
import type { StoryboardSegment } from './editor-data';

interface StatItem {
    label: string;
    value: string;
}

defineProps<{
    segments: StoryboardSegment[];
    stats: readonly StatItem[];
}>();
</script>

<template>
    <aside
        class="flex min-h-0 flex-col gap-3 overflow-hidden border-r border-[#222733] bg-[var(--mg-panel)] px-3 py-[18px]"
    >
        <div class="flex items-center justify-between">
            <div>
                <h1
                    class="text-xl font-bold leading-[22px] text-[var(--mg-text)]"
                >
                    文稿字幕
                </h1>
                <p
                    class="mt-1 text-[11px] font-medium text-[var(--mg-text-dim)]"
                >
                    智能分镜逐字稿
                </p>
            </div>
            <span
                class="rounded border border-[var(--mg-border)] bg-[#181d26] px-2 py-1 text-[11px] text-[var(--mg-text-muted)]"
            >
                {{ segments.length }} 段
            </span>
        </div>

        <dl
            class="grid grid-cols-3 rounded border border-[var(--mg-border)] bg-[var(--mg-panel-soft)] py-2"
        >
            <div
                v-for="(stat, index) in stats"
                :key="stat.label"
                class="px-2"
                :class="{
                    'border-r border-[#2b303a]': index < stats.length - 1
                }"
            >
                <dt class="text-[10px] font-semibold text-[var(--mg-text-dim)]">
                    {{ stat.label }}
                </dt>
                <dd
                    class="mt-1 font-mono text-sm font-semibold text-[var(--mg-text)]"
                >
                    {{ stat.value }}
                </dd>
            </div>
        </dl>

        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            <article
                v-for="segment in segments"
                :key="segment.id"
                class="rounded-md border p-[9px_10px]"
                :class="
                    segment.selected
                        ? 'border-2 border-[var(--mg-accent)] bg-[#211820]'
                        : 'border-[var(--mg-border)] bg-[#181d25]'
                "
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-[7px]">
                        <span
                            class="rounded px-1.5 py-[3px] text-[10px] font-bold leading-none"
                            :class="
                                segment.selected
                                    ? 'bg-[var(--mg-accent)] text-white'
                                    : 'border border-[#2a303a] bg-[#222834] text-[var(--mg-text-muted)]'
                            "
                        >
                            分镜{{ segment.id }}
                        </span>
                        <span
                            class="font-mono text-[10px] font-medium text-[var(--mg-text-dim)]"
                        >
                            {{ segment.start }} - {{ segment.end }}
                        </span>
                    </div>
                    <span
                        class="rounded border border-[#252b35] bg-[#10141b] px-1.5 py-[3px] font-mono text-[10px] font-semibold text-[var(--mg-text-dim)]"
                    >
                        {{ segment.duration }}
                    </span>
                </div>
                <p
                    class="mt-1.5 text-xs font-medium leading-4 text-[var(--mg-text-muted)]"
                >
                    {{ segment.description }}
                </p>
            </article>
        </div>
    </aside>
</template>
