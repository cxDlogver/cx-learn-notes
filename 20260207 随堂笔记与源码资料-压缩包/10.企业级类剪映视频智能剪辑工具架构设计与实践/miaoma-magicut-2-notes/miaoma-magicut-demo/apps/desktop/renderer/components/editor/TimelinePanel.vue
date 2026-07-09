<script setup lang="ts">
import type { TimelineTrack } from './editor-data';

defineProps<{
    ruler: readonly string[];
    tracks: TimelineTrack[];
}>();

const waveformHeights = [
    'h-2',
    'h-[15px]',
    'h-[22px]',
    'h-[29px]',
    'h-3.5',
    'h-[21px]',
    'h-7',
    'h-[13px]',
    'h-5',
    'h-[27px]',
    'h-3',
    'h-[19px]',
    'h-[26px]',
    'h-[11px]',
    'h-[18px]',
    'h-[25px]',
    'h-2.5',
    'h-[17px]',
    'h-6',
    'h-[9px]',
    'h-4',
    'h-[23px]'
] as const;

function getWaveformBars(count: number) {
    return Array.from({ length: count }, (_, index) => ({
        id: `${index}`,
        className: waveformHeights[index % waveformHeights.length]
    }));
}
</script>

<template>
    <section class="border-t border-[#202631] bg-[#0d1219]">
        <div class="flex h-[56px] items-center border-b border-[#202631] px-7">
            <div class="flex w-[360px] items-center gap-4">
                <h2
                    class="text-2xl font-bold leading-none text-[var(--mg-text)]"
                >
                    时间线
                </h2>
                <span class="font-mono text-sm text-[var(--mg-text-muted)]">
                    00:00:00 / 00:01:27
                </span>
                <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mg-border)] bg-[#111722] text-lg text-[var(--mg-text-muted)]"
                    title="撤销"
                    type="button"
                >
                    ↶
                </button>
                <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mg-border)] bg-[#111722] text-lg text-[var(--mg-text-muted)]"
                    title="重做"
                    type="button"
                >
                    ↷
                </button>
            </div>
            <div class="flex flex-1 items-center justify-end gap-2">
                <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mg-border)] bg-[#111722] text-lg text-[var(--mg-text-muted)]"
                    title="剪切片段"
                    type="button"
                >
                    ✂
                </button>
                <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mg-border)] bg-[#111722] text-lg text-[var(--mg-accent)]"
                    title="磁吸开关"
                    type="button"
                >
                    ⊂
                </button>
                <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mg-border)] bg-[#111722] text-lg text-[var(--mg-text-muted)]"
                    title="链接片段"
                    type="button"
                >
                    ⛓
                </button>
                <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mg-border)] bg-[#111722] text-lg text-[var(--mg-text-muted)]"
                    title="音频波形"
                    type="button"
                >
                    ≋
                </button>
                <div
                    class="ml-2 flex items-center gap-3 text-[var(--mg-text-dim)]"
                >
                    <span>-</span>
                    <div class="h-1 w-28 rounded-full bg-[#dce4f2]">
                        <div
                            class="ml-auto h-3 w-3 -translate-y-1 rounded-full bg-[#f4f7fb]"
                        ></div>
                    </div>
                    <span>+</span>
                </div>
            </div>
        </div>

        <div class="grid h-[260px] grid-cols-[210px_minmax(0,1fr)]">
            <div class="border-r border-[#202631] pt-[29px]">
                <div
                    v-for="track in tracks"
                    :key="track.id"
                    class="flex h-[74px] items-center gap-3 border-t border-[#202631] px-7"
                >
                    <span class="text-base text-[var(--mg-text-muted)]">{{
                        track.icon
                    }}</span>
                    <div>
                        <div
                            class="text-sm font-semibold text-[var(--mg-text)]"
                        >
                            {{ track.name }}
                        </div>
                        <div class="mt-1 text-xs text-[var(--mg-text-dim)]">
                            {{ track.detail }}
                        </div>
                    </div>
                </div>
            </div>

            <div class="relative overflow-hidden">
                <div class="mg-ruler h-[29px] border-b border-[#202631]">
                    <div
                        v-for="tick in ruler"
                        :key="tick"
                        class="absolute top-0 h-[29px] border-l border-[#27303e] pl-2 pt-2 font-mono text-[10px] text-[var(--mg-text-dim)]"
                        :class="{
                            'left-0': tick === '00:00',
                            'left-[8.7%]': tick === '00:10',
                            'left-[17.4%]': tick === '00:20',
                            'left-[26.1%]': tick === '00:30',
                            'left-[34.8%]': tick === '00:40',
                            'left-[43.5%]': tick === '00:50',
                            'left-[52.2%]': tick === '00:60',
                            'left-[60.9%]': tick === '00:70',
                            'left-[69.6%]': tick === '00:80'
                        }"
                    >
                        {{ tick }}
                    </div>
                </div>

                <div
                    class="absolute bottom-0 left-5 top-0 z-20 w-px bg-[var(--mg-accent)]"
                >
                    <span
                        class="absolute -left-[7px] top-[22px] h-3.5 w-3.5 rounded-full bg-[var(--mg-accent-2)] ring-2 ring-[var(--mg-accent)]"
                    ></span>
                </div>

                <div
                    v-for="track in tracks"
                    :key="track.id"
                    class="relative h-[74px] border-t border-[#202631]"
                >
                    <div
                        v-for="clip in track.clips"
                        :key="clip.id"
                        class="absolute top-[10px] flex h-11 items-center overflow-hidden whitespace-nowrap rounded-lg border px-3 text-sm font-semibold"
                        :class="clip.className"
                    >
                        <span class="relative z-10">{{ clip.label }}</span>
                        <div
                            v-if="clip.bars"
                            class="absolute bottom-2 right-4 top-2 flex items-center gap-[3px] opacity-70"
                            aria-hidden="true"
                        >
                            <span
                                v-for="bar in getWaveformBars(clip.bars)"
                                :key="bar.id"
                                class="w-[3px] rounded bg-[#75c88b]"
                                :class="bar.className"
                            ></span>
                        </div>
                        <div
                            v-if="track.id === 'video'"
                            class="ml-3 flex gap-1 opacity-30"
                            aria-hidden="true"
                        >
                            <span class="h-4 w-4 rounded bg-white"></span>
                            <span class="h-4 w-4 rounded bg-white"></span>
                            <span class="h-4 w-4 rounded bg-white"></span>
                            <span class="h-4 w-4 rounded bg-white"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.mg-ruler {
    position: relative;
    background-image: repeating-linear-gradient(
        to right,
        transparent 0,
        transparent 36px,
        #222a36 36px,
        #222a36 37px
    );
}
</style>
