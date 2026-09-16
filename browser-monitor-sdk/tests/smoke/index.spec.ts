import { describe, expect, it } from 'vitest';

describe('browser monitor SDK scaffold', () => {
  it('runs tests in a browser-like environment', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
  });

  it('exposes an importable package entry', async () => {
    const sdk = await import('../../src/index');

    expect(sdk).toBeTypeOf('object');
    expect(sdk.createPerformanceMonitor).toBeTypeOf('function');
  });
});
