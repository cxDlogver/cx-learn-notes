export interface StoryboardSegment {
    id: string;
    start: string;
    end: string;
    duration: string;
    description: string;
    selected?: boolean;
}

export interface EditorAnalysis {
    title: string;
    summary: string;
    segment: string;
    priority: string;
    tags: string[];
    insight: string[];
    metrics: {
        label: string;
        value: string;
    }[];
}

export interface TimelineClip {
    id: string;
    label: string;
    className: string;
    meta?: string;
    bars?: number;
}

export interface TimelineTrack {
    id: string;
    name: string;
    detail: string;
    icon: string;
    clips: TimelineClip[];
}

export type EditorTabId = 'visual' | 'voice';

export type EditorToolId = EditorTabId | 'caption' | 'music';

export type EditorToolIcon = 'image' | 'mic' | 'captions' | 'music';

export interface EditorTool {
    id: EditorToolId;
    label: string;
    icon: EditorToolIcon;
    tabId: EditorTabId | null;
    active: boolean;
    disabled: boolean;
}

export interface VoiceoverVoice {
    id: string;
    label: string;
    tone: string;
    selected?: boolean;
}

export type VoiceoverParameterIcon = 'volume-2' | 'gauge';

export interface VoiceoverParameter {
    id: string;
    label: string;
    value: string;
    progress: number;
    icon: VoiceoverParameterIcon;
}

export interface VoiceoverPanel {
    title: string;
    description: string;
    voiceSectionTitle: string;
    voiceSectionDescription: string;
    voices: VoiceoverVoice[];
    customVoiceLabel: string;
    customVoiceDescription: string;
    parameters: VoiceoverParameter[];
    primaryAction: string;
}

export const defaultEditorTabId: EditorTabId = 'visual';

const unavailableEditorTabId: EditorTabId | null = null;

export const editorTabs = [
    {
        id: 'visual',
        label: '画面',
        icon: 'image',
        tabId: 'visual'
    },
    {
        id: 'voice',
        label: '口播',
        icon: 'mic',
        tabId: 'voice'
    },
    {
        id: 'caption',
        label: '字幕',
        icon: 'captions',
        tabId: unavailableEditorTabId
    },
    {
        id: 'music',
        label: '音乐',
        icon: 'music',
        tabId: unavailableEditorTabId
    }
] as const satisfies readonly Omit<EditorTool, 'active' | 'disabled'>[];

export const editorTabIds = [
    'visual',
    'voice'
] as const satisfies readonly EditorTabId[];

export function createEditorTools(activeTabId: EditorTabId): EditorTool[] {
    return editorTabs.map((tab) => ({
        ...tab,
        active: tab.tabId === activeTabId,
        disabled: tab.tabId === null
    }));
}

export const storyboardSegments = [
    {
        id: '01',
        start: '00:00',
        end: '00:09',
        duration: '09s',
        description: '开场画面展示产品界面，旁白引出本期视频要解决的剪辑痛点。'
    },
    {
        id: '02',
        start: '00:09',
        end: '00:22',
        duration: '13s',
        description:
            '用户把素材拖入时间线，系统自动识别人物对白并生成初稿字幕。',
        selected: true
    },
    {
        id: '03',
        start: '00:22',
        end: '00:37',
        duration: '15s',
        description: '点击分镜卡片即可定位预览画面，调整字幕节奏与停顿。'
    },
    {
        id: '04',
        start: '00:37',
        end: '00:54',
        duration: '17s',
        description: 'AI 根据语义拆分章节，同时保留关键口播词和品牌名。'
    },
    {
        id: '05',
        start: '00:54',
        end: '01:12',
        duration: '18s',
        description: '选中片段后可微调语速、字幕样式，并同步到右侧参数面板。'
    },
    {
        id: '06',
        start: '01:12',
        end: '01:26',
        duration: '14s',
        description: '导出前快速检查错字与空白段，确认所有字幕已贴合画面。'
    }
] satisfies StoryboardSegment[];

export const scriptStats = [
    {
        label: '统计时间',
        value: '01:26'
    },
    {
        label: '字幕字数',
        value: '428 字'
    },
    {
        label: '分镜数',
        value: '6'
    }
] as const;

export const editorAnalysis = {
    title: '开场 3 秒需要更强钩子吗？',
    summary:
        '当前口播先解释背景，观众进入成本偏高。建议把结论前置，并让首帧字幕直接给出冲突点。',
    segment: '片段 00:00-00:08',
    priority: '优先级 高',
    tags: ['节奏偏慢', '钩子强化', '字幕密度', '镜头切换', '语气更直接'],
    insight: [
        '首段画面信息充足，但叙事顺序仍偏说明型：用户要先理解背景，才能知道为什么继续观看。建议把“结果”和“冲突”提前到第一句，并在 0.8 秒内给出醒目的字幕锚点，让观众马上知道这段视频要解决什么问题。',
        '剪辑层面，当前 B-roll 与口播停顿基本同步，节奏会显得规整但不够有推进感。可以在第二个停顿点插入更短的特写镜头，把字幕字号提高一级，并把关键词改成高亮色，形成更明确的视觉重音。结尾保留原语气，但把 CTA 缩短成一个动作指令。'
    ],
    metrics: [
        {
            label: '钩子',
            value: '前置结论'
        },
        {
            label: '节奏',
            value: '压缩 12%'
        },
        {
            label: '字幕',
            value: '关键词高亮'
        }
    ]
} satisfies EditorAnalysis;

export const voiceoverPanel = {
    title: '口播配音',
    description: '为当前分镜生成旁白音轨',
    voiceSectionTitle: '选择音色',
    voiceSectionDescription: '系统音色与自定义音色库 · 支持试听',
    voices: [
        {
            id: 'warm-senior',
            label: '温婉学姐',
            tone: '自然女声 · 推荐',
            selected: true
        },
        {
            id: 'steady-male',
            label: '沉稳男声',
            tone: '低频清晰'
        },
        {
            id: 'news-anchor',
            label: '新闻播报',
            tone: '稳重正式'
        },
        {
            id: 'energetic-explainer',
            label: '活力讲解',
            tone: '节奏明快'
        }
    ],
    customVoiceLabel: '自定义音色库',
    customVoiceDescription: '上传 10s 内音频，保存后可作为音色使用',
    parameters: [
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
    ],
    primaryAction: '生成口播稿'
} satisfies VoiceoverPanel;

export const timelineRuler = [
    '00:00',
    '00:10',
    '00:20',
    '00:30',
    '00:40',
    '00:50',
    '00:60',
    '00:70',
    '00:80'
] as const;

export const timelineTracks = [
    {
        id: 'video',
        name: '视频 1',
        detail: '5 个分镜',
        icon: '▦',
        clips: [
            {
                id: 'scene-01',
                label: '分镜01',
                className:
                    'left-[0.4%] w-[14.8%] border-teal-400 bg-teal-500/70 text-teal-50'
            },
            {
                id: 'scene-02',
                label: '分镜02',
                className:
                    'left-[16.4%] w-[13.6%] border-blue-300 bg-blue-500/70 text-blue-50',
                meta: 'selected'
            },
            {
                id: 'scene-03',
                label: '分镜03',
                className:
                    'left-[31.2%] w-[13.4%] border-violet-300 bg-violet-500/70 text-violet-50'
            },
            {
                id: 'scene-04',
                label: '分镜04',
                className:
                    'left-[45.6%] w-[14.2%] border-rose-300 bg-rose-500/70 text-rose-50'
            },
            {
                id: 'scene-05',
                label: '分镜05',
                className:
                    'left-[61.2%] w-[14.6%] border-slate-300 bg-slate-500/60 text-slate-100'
            }
        ]
    },
    {
        id: 'voice',
        name: '配音',
        detail: 'IndexTTS2 + 旁白',
        icon: '◖',
        clips: [
            {
                id: 'voice-01',
                label: 'IndexTTS2 口播',
                className:
                    'left-[0.4%] w-[29%] border-green-500/40 bg-green-700 text-green-50',
                bars: 42
            },
            {
                id: 'pause',
                label: '停顿  Ⅱ',
                className:
                    'left-[30.2%] w-[4.8%] border-slate-500/70 bg-slate-600 text-slate-100'
            },
            {
                id: 'voice-02',
                label: '旁白 02',
                className:
                    'left-[35.8%] w-[23%] border-green-500/40 bg-green-700 text-green-50',
                bars: 24
            }
        ]
    },
    {
        id: 'caption',
        name: '字幕',
        detail: 'Whisper 已对齐',
        icon: '▤',
        clips: [
            {
                id: 'caption-01',
                label: 'Whisper 字幕 · 自动断句 · 可逐字微调',
                className:
                    'left-[0.4%] w-[52.6%] border-amber-400/50 bg-amber-700 text-amber-50'
            }
        ]
    }
] satisfies TimelineTrack[];
