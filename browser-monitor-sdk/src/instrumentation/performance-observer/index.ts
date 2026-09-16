export type PerformanceEntryHandler = (entry: PerformanceEntry) => void;

export function supportsPerformanceEntry(type: string): boolean {
  if (typeof PerformanceObserver === 'undefined') return false;

  const supportedEntryTypes = PerformanceObserver.supportedEntryTypes;
  return Array.isArray(supportedEntryTypes) && supportedEntryTypes.includes(type);
}

export function observePerformanceEntries(
  type: string,
  handler: PerformanceEntryHandler,
  buffered: boolean,
): () => void {
  if (!supportsPerformanceEntry(type)) return () => undefined;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) handler(entry);
    });

    observer.observe({ type, buffered });
    return () => observer.disconnect();
  } catch {
    return () => undefined;
  }
}
