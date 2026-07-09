<template>
    <header
        class="flex h-16 items-center border-b border-[var(--mg-border-soft)] bg-[#0d1016] px-6"
    >
        <div class="flex w-[360px] items-center gap-3">
            <div
                class="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg bg-[var(--mg-accent)] p-1.5"
                aria-hidden="true"
            >
                <span class="rounded-[2px] bg-[#ffe0e8]"></span>
                <span class="rounded-[2px] bg-[#b9143e]"></span>
                <span class="rounded-[2px] bg-[#ffe0e8]"></span>
                <span class="rounded-[2px] bg-[#b9143e]"></span>
            </div>
            <div>
                <p
                    class="text-base font-bold leading-none text-[var(--mg-text)]"
                >
                    妙剪 Magicut
                </p>
                <p
                    class="mt-1 text-[11px] font-medium text-[var(--mg-text-muted)]"
                >
                    AI 口播视频剪辑工作台
                </p>
            </div>
        </div>

        <div class="h-8 w-px bg-[var(--mg-border)]"></div>

        <div class="flex flex-1 flex-col items-center justify-center">
            <p class="text-[15px] font-bold leading-none text-[var(--mg-text)]">
                口播短片自动剪辑工程
            </p>
            <div class="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
                <span
                    class="h-1.5 w-1.5 rounded-full bg-[var(--mg-accent-2)]"
                ></span>
                <span class="text-[var(--mg-text-muted)]">已自动保存</span>
                <span
                    class="h-0.5 w-0.5 rounded-full bg-[var(--mg-text-dim)]"
                ></span>
                <span class="font-mono text-[10px] text-[var(--mg-text-dim)]">
                    刚刚同步
                </span>
            </div>
        </div>

        <button
            class="flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg bg-[var(--mg-accent-2)] px-4 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            title="渲染并导出当前剪辑工程"
            type="button"
        >
            <span class="text-base leading-none" aria-hidden="true">↥</span>
            <span>渲染导出</span>
        </button>
    </header>
</template>
