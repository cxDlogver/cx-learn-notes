<script setup lang="ts">
import { computed } from 'vue';

import {
    createEditorTools,
    editorAnalysis,
    scriptStats,
    storyboardSegments,
    timelineRuler,
    timelineTracks,
    voiceoverPanel
} from './editor-data';
import EditorHeader from './EditorHeader.vue';
import InspectorPanel from './InspectorPanel.vue';
import PreviewPanel from './PreviewPanel.vue';
import ScriptSidebar from './ScriptSidebar.vue';
import TimelinePanel from './TimelinePanel.vue';
import ToolRail from './ToolRail.vue';
import { createEditorTabState } from './use-editor-tab-state';
import VoiceoverPanel from './VoiceoverPanel.vue';

const { activeTabId, selectTab } = createEditorTabState();

const activeTools = computed(() => createEditorTools(activeTabId.value));
</script>

<template>
    <section
        class="h-full w-full bg-[var(--mg-bg-root)] p-[6px] text-[var(--mg-text)]"
    >
        <div
            class="grid h-full min-h-0 overflow-hidden rounded-[2px] border border-black/30 bg-[var(--mg-surface-0)] shadow-2xl grid-cols-[298px_minmax(0,1fr)_326px_64px] grid-rows-[64px_minmax(0,1fr)_317px]"
        >
            <EditorHeader class="col-span-4" />
            <ScriptSidebar
                class="min-h-0"
                :segments="storyboardSegments"
                :stats="scriptStats"
            />
            <PreviewPanel class="min-h-0" />
            <VoiceoverPanel
                v-if="activeTabId === 'voice'"
                class="min-h-0"
                :panel="voiceoverPanel"
            />
            <InspectorPanel v-else class="min-h-0" :analysis="editorAnalysis" />
            <ToolRail
                class="min-h-0"
                :tools="activeTools"
                @select="selectTab"
            />
            <TimelinePanel
                class="col-span-4 min-h-0"
                :ruler="timelineRuler"
                :tracks="timelineTracks"
            />
        </div>
    </section>
</template>
