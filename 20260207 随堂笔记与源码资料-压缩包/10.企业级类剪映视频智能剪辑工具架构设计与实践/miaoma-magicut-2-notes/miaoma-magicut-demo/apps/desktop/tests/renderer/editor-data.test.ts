import { describe, expect, it } from 'vitest';

import {
    editorAnalysis,
    storyboardSegments,
    timelineTracks
} from '@/renderer/components/editor/editor-data';

describe('editor-data', () => {
    it('keeps the storyboard content aligned with the Pencil design', () => {
        expect(storyboardSegments).toHaveLength(6);
        expect(storyboardSegments[1]).toMatchObject({
            id: '02',
            selected: true,
            start: '00:09',
            end: '00:22',
            duration: '13s'
        });
        expect(storyboardSegments[1]?.description).toContain(
            '系统自动识别人物对白并生成初稿字幕'
        );
    });

    it('exposes the primary analysis recommendation and timeline tracks', () => {
        expect(editorAnalysis.title).toBe('开场 3 秒需要更强钩子吗？');
        expect(editorAnalysis.tags).toContain('钩子强化');
        expect(timelineTracks.map((track) => track.name)).toEqual([
            '视频 1',
            '配音',
            '字幕'
        ]);
    });
});
