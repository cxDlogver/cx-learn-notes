import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    collectAudioFromMessages,
    parseTtsStreamLine,
    redactSecret,
    splitStreamTextIntoLines
} from '../dist/index.js';

test('parseTtsStreamLine parses audio chunks without widening unknown JSON', () => {
    const audio = Buffer.from('hello audio').toString('base64');
    const message = parseTtsStreamLine(
        JSON.stringify({ code: 0, data: audio, message: 'ok' })
    );

    assert.deepEqual(message, {
        code: 0,
        data: audio,
        message: 'ok'
    });
});

test('collectAudioFromMessages joins base64 chunks until the completion code', () => {
    const first = Buffer.from('hello ');
    const second = Buffer.from('world');

    const result = collectAudioFromMessages([
        { code: 0, data: first.toString('base64') },
        { code: 0, data: second.toString('base64') },
        { code: 20000000, message: 'done' }
    ]);

    assert.equal(result.byteLength, first.byteLength + second.byteLength);
    assert.equal(result.audio.toString('utf8'), 'hello world');
});

test('splitStreamTextIntoLines keeps partial JSON lines across chunks', () => {
    const first = splitStreamTextIntoLines('', '{"code":0');
    const result = splitStreamTextIntoLines(
        first.remainder,
        '}\n{"code":20000000}\n'
    );

    assert.deepEqual(first.lines, []);
    assert.deepEqual(result.lines, ['{"code":0}', '{"code":20000000}']);
    assert.equal(result.remainder, '');
});

test('redactSecret hides configured API keys from diagnostics', () => {
    const result = redactSecret(
        'request failed with ark-secret-value',
        'ark-secret-value'
    );

    assert.equal(result, 'request failed with [REDACTED]');
});
