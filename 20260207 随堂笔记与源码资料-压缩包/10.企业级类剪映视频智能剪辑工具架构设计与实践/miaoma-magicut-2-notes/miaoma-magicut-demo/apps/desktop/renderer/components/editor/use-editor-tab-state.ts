import { readonly, shallowRef } from 'vue';

import {
    defaultEditorTabId,
    type EditorTabId,
    editorTabIds
} from './editor-data';

export const editorTabStorageKey = 'miaoma.editor.activeTab';

export interface EditorTabStorage {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}

export function resolveEditorTabId(
    value: string | null | undefined
): EditorTabId {
    return editorTabIds.includes(value as EditorTabId)
        ? (value as EditorTabId)
        : defaultEditorTabId;
}

function getBrowserStorage(): EditorTabStorage | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

function getStoredTabId(storage: EditorTabStorage | undefined): string | null {
    try {
        return storage?.getItem(editorTabStorageKey) ?? null;
    } catch {
        return null;
    }
}

export function createEditorTabState(
    storage: EditorTabStorage | undefined = getBrowserStorage()
) {
    const activeTabId = shallowRef<EditorTabId>(
        resolveEditorTabId(getStoredTabId(storage))
    );

    function selectTab(tabId: EditorTabId): void {
        activeTabId.value = tabId;

        try {
            storage?.setItem(editorTabStorageKey, tabId);
        } catch {
            // localStorage can be unavailable in restricted browser contexts.
        }
    }

    return {
        activeTabId: readonly(activeTabId),
        selectTab
    };
}
