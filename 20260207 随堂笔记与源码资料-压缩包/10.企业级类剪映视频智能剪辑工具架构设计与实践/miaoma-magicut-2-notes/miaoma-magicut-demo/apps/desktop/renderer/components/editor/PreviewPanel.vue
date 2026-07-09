<template>
    <section
        class="flex min-h-0 flex-col items-center justify-center border-r border-[#1e2430] bg-[#0b0f16] px-8 py-8"
    >
        <div class="flex w-full max-w-[864px] flex-col">
            <div
                class="mg-checker aspect-video w-full border border-[#252b35] shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
                aria-label="视频预览区域"
            ></div>

            <div class="mt-4 h-0.5 w-full bg-[#1f2530]">
                <div class="h-0.5 w-[14%] bg-[var(--mg-accent)]"></div>
            </div>

            <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <button
                        class="flex h-9 w-9 items-center justify-center rounded border border-[var(--mg-border)] bg-[#111722] text-sm text-[var(--mg-text)] transition hover:border-[var(--mg-accent)]"
                        title="播放预览"
                        type="button"
                    >
                        ▶
                    </button>
                    <span class="font-mono text-sm text-[var(--mg-text-muted)]">
                        00:07 / 00:15
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        class="flex h-9 w-9 items-center justify-center rounded border border-[var(--mg-border)] bg-[#111722] text-sm text-[var(--mg-text-muted)] transition hover:text-[var(--mg-text)]"
                        title="预览音量"
                        type="button"
                    >
                        ◔
                    </button>
                    <button
                        class="flex h-9 w-9 items-center justify-center rounded border border-[var(--mg-border)] bg-[#111722] text-sm text-[var(--mg-text-muted)] transition hover:text-[var(--mg-text)]"
                        title="全屏预览"
                        type="button"
                    >
                        ⤢
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.mg-checker {
    background-color: #151b24;
    background-image:
        linear-gradient(45deg, #1b222d 25%, transparent 25%),
        linear-gradient(-45deg, #1b222d 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1b222d 75%),
        linear-gradient(-45deg, transparent 75%, #1b222d 75%);
    background-position:
        0 0,
        0 28px,
        28px -28px,
        -28px 0;
    background-size: 56px 56px;
}
</style>
