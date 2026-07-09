<script setup lang="ts">
import type { VoiceoverPanel } from './editor-data';

defineProps<{
    panel: VoiceoverPanel;
}>();

const parameterIconGlyphs = {
    'volume-2': '◖',
    gauge: '↯'
} satisfies Record<VoiceoverPanel['parameters'][number]['icon'], string>;

function getParameterIcon(
    icon: VoiceoverPanel['parameters'][number]['icon']
): string {
    return parameterIconGlyphs[icon];
}
</script>

<template>
    <aside
        class="min-h-0 overflow-hidden border-x border-[#252a34] bg-[#0f1216] px-[22px] py-7 text-[var(--mg-text)]"
    >
        <header>
            <h2 class="text-[28px] font-extrabold leading-none">
                {{ panel.title }}
            </h2>
            <p class="mt-3 text-sm font-semibold text-[var(--mg-text-dim)]">
                {{ panel.description }}
            </p>
        </header>

        <section
            class="mt-8 rounded-2xl border border-[#303641] bg-[#171b20] p-5"
        >
            <h3 class="text-[19px] font-extrabold leading-none">
                {{ panel.voiceSectionTitle }}
            </h3>
            <p class="mt-3 text-[13px] font-semibold text-[var(--mg-text-dim)]">
                {{ panel.voiceSectionDescription }}
            </p>

            <div class="mt-5 grid grid-cols-2 gap-x-[18px] gap-y-2.5">
                <button
                    v-for="voice in panel.voices"
                    :key="voice.id"
                    class="relative h-[62px] rounded-xl border px-3 text-left transition"
                    :class="
                        voice.selected
                            ? 'border-[2px] border-[var(--mg-accent)] bg-[#52303b]'
                            : 'border-[#2a303b] bg-[var(--mg-panel)] hover:border-[#3b4350]'
                    "
                    :title="voice.label"
                    type="button"
                >
                    <span
                        class="block text-sm font-extrabold text-[var(--mg-text)]"
                    >
                        {{ voice.label }}
                    </span>
                    <span
                        class="mt-2 block text-[11px] font-semibold"
                        :class="
                            voice.selected
                                ? 'text-[#ff6b88]'
                                : 'text-[var(--mg-text-dim)]'
                        "
                    >
                        {{ voice.tone }}
                    </span>
                    <span
                        class="absolute right-2 top-[17px] flex h-7 w-7 items-center justify-center rounded-full text-xs"
                        :class="
                            voice.selected
                                ? 'bg-[#824052] text-[#ff6b88]'
                                : 'bg-[#202631] text-[#8d96a5]'
                        "
                        aria-hidden="true"
                    >
                        ▶
                    </span>
                </button>
            </div>

            <button
                class="mt-3 flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#3a414d] bg-[var(--mg-panel)] px-4 text-left transition hover:border-[#4a5360]"
                title="打开自定义音色库"
                type="button"
            >
                <span
                    class="text-base text-[var(--mg-text)]"
                    aria-hidden="true"
                >
                    ＋
                </span>
                <span>
                    <span
                        class="block text-sm font-extrabold text-[var(--mg-text)]"
                    >
                        {{ panel.customVoiceLabel }}
                    </span>
                    <span
                        class="mt-1 block text-[11px] font-medium text-[var(--mg-text-dim)]"
                    >
                        {{ panel.customVoiceDescription }}
                    </span>
                </span>
            </button>
        </section>

        <section
            class="mt-4 rounded-2xl border border-[#303641] bg-[#171b20] p-5"
        >
            <h3 class="text-lg font-extrabold leading-none">参数调整</h3>

            <div
                v-for="parameter in panel.parameters"
                :key="parameter.id"
                class="mt-6"
            >
                <div class="flex items-center gap-2 text-sm font-semibold">
                    <span
                        class="text-lg leading-none text-[#aab2bf]"
                        aria-hidden="true"
                    >
                        {{ getParameterIcon(parameter.icon) }}
                    </span>
                    <span class="text-[#aab2bf]">{{ parameter.label }}</span>
                    <span class="ml-auto font-extrabold text-[#eef2f8]">
                        {{ parameter.value }}
                    </span>
                </div>
                <div class="mt-4 h-2 rounded bg-[#2a3039]">
                    <div
                        class="relative h-2 rounded bg-[#f2f4f8]"
                        :style="{ width: `${parameter.progress * 100}%` }"
                    >
                        <span
                            class="absolute right-0 top-1/2 h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 rounded-full bg-white ring-4 ring-[#0c1016]"
                        ></span>
                    </div>
                </div>
            </div>
        </section>

        <button
            class="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--mg-accent)] text-base font-bold text-white transition hover:brightness-110"
            :title="panel.primaryAction"
            type="button"
        >
            <span class="text-lg" aria-hidden="true">◖</span>
            {{ panel.primaryAction }}
        </button>
    </aside>
</template>
