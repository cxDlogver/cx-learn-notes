<script setup lang="ts">
import type { EditorTabId, EditorTool } from './editor-data';

defineProps<{
    tools: ReadonlyArray<EditorTool>;
}>();

const emit = defineEmits<{
    select: [tabId: EditorTabId];
}>();

const toolIconGlyphs = {
    image: '▧',
    mic: '◖',
    captions: '▤',
    music: '♪'
} satisfies Record<EditorTool['icon'], string>;

function getToolIcon(icon: EditorTool['icon']): string {
    return toolIconGlyphs[icon];
}

function selectTool(tool: EditorTool): void {
    if (tool.tabId === null) {
        return;
    }

    emit('select', tool.tabId);
}
</script>

<template>
    <nav class="flex min-h-0 flex-col items-center gap-0.5 bg-[#101317] py-4">
        <button
            v-for="tool in tools"
            :key="tool.id"
            class="relative flex h-[66px] w-16 flex-col items-center justify-center gap-1 text-xs transition"
            :class="
                tool.active
                    ? 'bg-[#241820] font-semibold text-[var(--mg-accent)]'
                    : 'bg-[#101317] font-medium text-[var(--mg-text-muted)] hover:bg-[#141922] hover:text-[var(--mg-text)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#101317] disabled:hover:text-[var(--mg-text-muted)]'
            "
            :disabled="tool.disabled"
            :title="tool.disabled ? `${tool.label}暂未开放` : tool.label"
            type="button"
            @click="selectTool(tool)"
        >
            <span
                v-if="tool.active"
                class="absolute left-0 top-2 h-11 w-[3px] rounded-r bg-[var(--mg-accent)]"
            ></span>
            <span
                v-if="tool.active"
                class="absolute left-2 top-0 h-px w-12 bg-[#33212a]"
            ></span>
            <span
                v-if="tool.active"
                class="absolute bottom-0 left-2 h-px w-12 bg-[#33212a]"
            ></span>
            <span class="text-[22px] leading-none" aria-hidden="true">
                {{ getToolIcon(tool.icon) }}
            </span>
            <span>{{ tool.label }}</span>
        </button>
    </nav>
</template>
