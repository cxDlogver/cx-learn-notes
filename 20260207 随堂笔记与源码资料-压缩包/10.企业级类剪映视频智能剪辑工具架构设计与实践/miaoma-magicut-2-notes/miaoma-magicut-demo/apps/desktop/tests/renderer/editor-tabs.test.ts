import { describe, expect, it, vi } from 'vitest';

import {
    createEditorTools,
    defaultEditorTabId,
    editorTabs,
    voiceoverPanel
} from '@/renderer/components/editor/editor-data';
import {
    createEditorTabState,
    resolveEditorTabId
} from '@/renderer/components/editor/use-editor-tab-state';

describe('editor tabs', () => {
    it('defines voiceover as an independent editor tab', () => {
        expect(editorTabs.map((tab) => tab.id)).toEqual([
            'visual',
            'voice',
            'caption',
            'music'
        ]);
        expect(editorTabs.map((tab) => tab.icon)).toEqual([
            'image',
            'mic',
            'captions',
            'music'
        ]);

        expect(createEditorTools('voice')).toMatchObject([
            { id: 'visual', label: '画面', active: false, disabled: false },
            { id: 'voice', label: '口播', active: true, disabled: false },
            { id: 'caption', label: '字幕', active: false, disabled: true },
            { id: 'music', label: '音乐', active: false, disabled: true }
        ]);
    });

    it('restores a persisted tab and ignores invalid storage values', () => {
        expect(resolveEditorTabId('voice')).toBe('voice');
        expect(resolveEditorTabId('caption')).toBe(defaultEditorTabId);
        expect(resolveEditorTabId('music')).toBe(defaultEditorTabId);
        expect(resolveEditorTabId('unknown-tab')).toBe(defaultEditorTabId);
        expect(resolveEditorTabId(null)).toBe(defaultEditorTabId);
    });

    it('persists tab changes through the storage adapter', () => {
        const storage = {
            getItem: vi.fn().mockReturnValue('voice'),
            setItem: vi.fn()
        };
        const state = createEditorTabState(storage);

        expect(state.activeTabId.value).toBe('voice');

        state.selectTab('visual');

        expect(storage.setItem).toHaveBeenCalledWith(
            'miaoma.editor.activeTab',
            'visual'
        );
        expect(state.activeTabId.value).toBe('visual');
    });

    it('falls back to the default tab when storage is unavailable', () => {
        const storage = {
            getItem: vi.fn(() => {
                throw new Error('storage unavailable');
            }),
            setItem: vi.fn(() => {
                throw new Error('storage unavailable');
            })
        };
        const state = createEditorTabState(storage);

        expect(state.activeTabId.value).toBe(defaultEditorTabId);

        expect(() => state.selectTab('voice')).not.toThrow();
        expect(state.activeTabId.value).toBe('voice');
    });

    it('matches the Pencil voiceover configuration copy', () => {
        expect(voiceoverPanel.title).toBe('口播配音');
        expect(voiceoverPanel.description).toBe('为当前分镜生成旁白音轨');
        expect(voiceoverPanel.voices[0]).toMatchObject({
            label: '温婉学姐',
            tone: '自然女声 · 推荐',
            selected: true
        });
        expect(voiceoverPanel.voices.map((voice) => voice.tone)).toEqual([
            '自然女声 · 推荐',
            '低频清晰',
            '稳重正式',
            '节奏明快'
        ]);
        expect(voiceoverPanel.customVoiceDescription).toBe(
            '上传 10s 内音频，保存后可作为音色使用'
        );
        expect(voiceoverPanel.parameters).toEqual([
            {
                id: 'volume',
                label: '音量',
                value: '82%',
                progress: 0.82,
                icon: 'volume-2'
            },
            {
                id: 'speed',
                label: '语速',
                value: '1.05x',
                progress: 0.63,
                icon: 'gauge'
            }
        ]);
        expect(voiceoverPanel.primaryAction).toBe('生成口播稿');
    });
});
