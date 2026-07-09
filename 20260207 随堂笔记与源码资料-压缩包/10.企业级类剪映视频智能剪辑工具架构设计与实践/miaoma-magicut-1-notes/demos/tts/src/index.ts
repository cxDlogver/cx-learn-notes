import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_ENDPOINT =
    'https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional';
export const DEFAULT_FORMAT = 'mp3';
export const DEFAULT_MODEL = 'seed-tts-2.0';
export const DEFAULT_SAMPLE_RATE = 24000;
export const DEFAULT_SPEAKER = 'zh_female_vv_uranus_bigtts';
export const DEFAULT_TEXT =
    '这个项目的重点不是简单调用 AI 剪视频，而是把剪辑过程工程化为可暂停、可回退、可观测、可测试的多 Agent 工作流。AI 负责生成和判断，Orchestrator 负责状态和确定性，人工审批保证创意质量，最终通过时间线模型落到真实可编辑工程。';

const demoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export const DEFAULT_OUTPUT_PATH = join(demoRoot, 'output', 'tts_test.mp3');

type FetchLike = typeof fetch;
type Env = Readonly<Record<string, string | undefined>>;

export interface TtsUsage {
    readonly text_words?: number;
}

export interface TtsStreamMessage {
    readonly code: number;
    readonly data?: string;
    readonly message?: string;
    readonly usage?: TtsUsage;
}

export interface CollectedTtsAudio {
    readonly audio: Buffer;
    readonly byteLength: number;
    readonly usage?: TtsUsage;
}

export interface SplitLinesResult {
    readonly lines: string[];
    readonly remainder: string;
}

export interface TtsRequestOptions {
    readonly apiKey: string;
    readonly endpoint: string;
    readonly fetchImpl?: FetchLike;
    readonly format: string;
    readonly model: string;
    readonly outputPath: string;
    readonly sampleRate: number;
    readonly speaker: string;
    readonly text: string;
}

export interface TtsResult {
    readonly byteLength: number;
    readonly logId: string;
    readonly outputPath: string;
    readonly usage?: TtsUsage;
}

interface TtsRequestBody {
    readonly req_params: {
        readonly audio_params: {
            readonly format: string;
            readonly sample_rate: number;
        };
        readonly speaker: string;
        readonly text: string;
    };
}

class TtsDemoError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TtsDemoError';
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isUsage = (value: unknown): value is TtsUsage =>
    isRecord(value) &&
    (value.text_words === undefined || typeof value.text_words === 'number');

export const redactSecret = (message: string, secret: string): string => {
    if (!secret) {
        return message;
    }

    return message.split(secret).join('[REDACTED]');
};

export const splitStreamTextIntoLines = (
    remainder: string,
    chunk: string
): SplitLinesResult => {
    const merged = `${remainder}${chunk}`;
    const parts = merged.split(/\r?\n/);
    const nextRemainder = parts.pop() ?? '';
    const lines = parts
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    return {
        lines,
        remainder: nextRemainder
    };
};

export const parseTtsStreamLine = (line: string): TtsStreamMessage => {
    const parsed: unknown = JSON.parse(line);

    if (!isRecord(parsed) || typeof parsed.code !== 'number') {
        throw new TtsDemoError(`Invalid TTS stream line: ${line}`);
    }

    const data = typeof parsed.data === 'string' ? parsed.data : undefined;
    const message =
        typeof parsed.message === 'string' ? parsed.message : undefined;
    const usage = isUsage(parsed.usage) ? parsed.usage : undefined;

    return {
        code: parsed.code,
        ...(data !== undefined ? { data } : {}),
        ...(message !== undefined ? { message } : {}),
        ...(usage !== undefined ? { usage } : {})
    };
};

export const collectAudioFromMessages = (
    messages: Iterable<TtsStreamMessage>
): CollectedTtsAudio => {
    const chunks: Buffer[] = [];
    let completed = false;
    let usage: TtsUsage | undefined;

    for (const message of messages) {
        if (message.usage !== undefined) {
            usage = message.usage;
        }

        if (message.code === 20000000) {
            completed = true;
            break;
        }

        if (message.code > 0) {
            throw new TtsDemoError(formatProviderError(message));
        }

        if (message.data !== undefined && message.data.length > 0) {
            chunks.push(Buffer.from(message.data, 'base64'));
        }
    }

    if (!completed) {
        throw new TtsDemoError(
            'TTS stream ended before completion code 20000000'
        );
    }

    const audio = Buffer.concat(chunks);

    if (audio.byteLength === 0) {
        throw new TtsDemoError('No audio data received from TTS response');
    }

    return {
        audio,
        byteLength: audio.byteLength,
        ...(usage !== undefined ? { usage } : {})
    };
};

export const createOptionsFromEnv = (
    env: Env = process.env
): TtsRequestOptions => {
    const apiKey =
        env.VOLCENGINE_TTS_API_KEY ||
        'ark-1b17bcee-e388-4d6d-83fe-1293234a883d-95b94';

    if (!apiKey) {
        throw new TtsDemoError(
            'Missing required environment variable VOLCENGINE_TTS_API_KEY'
        );
    }

    return {
        apiKey,
        endpoint: env.VOLCENGINE_TTS_ENDPOINT ?? DEFAULT_ENDPOINT,
        format: env.VOLCENGINE_TTS_FORMAT ?? DEFAULT_FORMAT,
        model: env.VOLCENGINE_TTS_MODEL ?? DEFAULT_MODEL,
        outputPath: env.VOLCENGINE_TTS_OUTPUT ?? DEFAULT_OUTPUT_PATH,
        sampleRate: parsePositiveInteger(
            env.VOLCENGINE_TTS_SAMPLE_RATE,
            DEFAULT_SAMPLE_RATE
        ),
        speaker: env.VOLCENGINE_TTS_SPEAKER ?? DEFAULT_SPEAKER,
        text: env.VOLCENGINE_TTS_TEXT ?? DEFAULT_TEXT
    };
};

export const synthesizeSpeech = async (
    options: TtsRequestOptions
): Promise<TtsResult> => {
    const fetchImpl = options.fetchImpl ?? fetch;
    const requestId = randomUUID();
    const requestBody = {
        req_params: {
            audio_params: {
                format: options.format,
                sample_rate: options.sampleRate
            },
            speaker: options.speaker,
            text: options.text
        }
    } satisfies TtsRequestBody;

    const response = await fetchImpl(options.endpoint, {
        body: JSON.stringify(requestBody),
        headers: {
            Connection: 'keep-alive',
            'Content-Type': 'application/json',
            'X-Api-Key': options.apiKey,
            'X-Api-Request-Id': requestId,
            'X-Api-Resource-Id': options.model,
            'X-Control-Require-Usage-Tokens-Return': '*'
        },
        method: 'POST'
    });
    const logId = response.headers.get('x-tt-logid') ?? 'unknown';

    if (!response.ok) {
        const responseText = redactSecret(
            await response.text(),
            options.apiKey
        );
        throw new TtsDemoError(
            `TTS HTTP request failed: ${response.status} ${response.statusText} ${responseText}`
        );
    }

    if (response.body === null) {
        throw new TtsDemoError('TTS HTTP response body is empty');
    }

    const messages = await readMessagesFromStream(response.body);
    const collected = collectAudioFromMessages(messages);

    await mkdir(dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, collected.audio);

    return {
        byteLength: collected.byteLength,
        logId,
        outputPath: options.outputPath,
        ...(collected.usage !== undefined ? { usage: collected.usage } : {})
    };
};

const readMessagesFromStream = async (
    body: ReadableStream<Uint8Array>
): Promise<TtsStreamMessage[]> => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const messages: TtsStreamMessage[] = [];
    let remainder = '';

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        const split = splitStreamTextIntoLines(
            remainder,
            decoder.decode(value, { stream: true })
        );
        remainder = split.remainder;

        for (const line of split.lines) {
            messages.push(parseTtsStreamLine(line));
        }
    }

    const finalSplit = splitStreamTextIntoLines(remainder, decoder.decode());

    for (const line of finalSplit.lines) {
        messages.push(parseTtsStreamLine(line));
    }

    if (finalSplit.remainder.trim().length > 0) {
        messages.push(parseTtsStreamLine(finalSplit.remainder.trim()));
    }

    return messages;
};

const formatProviderError = (message: TtsStreamMessage): string => {
    const detail =
        message.message !== undefined ? `, message=${message.message}` : '';

    return `TTS provider returned error code=${message.code}${detail}`;
};

const parsePositiveInteger = (
    value: string | undefined,
    fallback: number
): number => {
    if (value === undefined || value.trim().length === 0) {
        return fallback;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new TtsDemoError(`Expected positive integer, received ${value}`);
    }

    return parsed;
};

const serializeError = (error: unknown, secret: string): string => {
    const message = error instanceof Error ? error.message : String(error);

    return redactSecret(message, secret);
};

const writeInfo = (message: string): void => {
    process.stdout.write(`${message}\n`);
};

const writeError = (message: string): void => {
    process.stderr.write(`${message}\n`);
};

const main = async (): Promise<void> => {
    let apiKey = '';

    try {
        const options = createOptionsFromEnv();
        apiKey = options.apiKey;
        writeInfo(
            `TTS request started: endpoint=${options.endpoint}, model=${options.model}, speaker=${options.speaker}`
        );

        const result = await synthesizeSpeech(options);
        writeInfo(`TTS logid: ${result.logId}`);
        writeInfo(`Audio bytes: ${result.byteLength}`);
        writeInfo(`Output file: ${result.outputPath}`);

        if (result.usage?.text_words !== undefined) {
            writeInfo(`Usage text words: ${result.usage.text_words}`);
        }
    } catch (error) {
        writeError(`TTS demo failed: ${serializeError(error, apiKey)}`);
        process.exitCode = 1;
    }
};

const isMainModule = (metaUrl: string): boolean => {
    const entry = process.argv[1];

    return entry !== undefined && pathToFileURL(entry).href === metaUrl;
};

if (isMainModule(import.meta.url)) {
    void main();
}
