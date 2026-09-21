import type { RuntimeContextData } from '../protocol/context';
import { SDK_NAME } from '@browser-monitor/protocol/constants';

const SDK_VERSION = '0.2.0';

export class RuntimeContext {
  snapshot(): RuntimeContextData {
    const navigatorValue = typeof navigator === 'undefined' ? undefined : navigator;

    return Object.freeze({
      ...(navigatorValue?.userAgent ? { userAgent: navigatorValue.userAgent } : {}),
      ...(navigatorValue?.language ? { language: navigatorValue.language } : {}),
      ...(navigatorValue?.platform ? { platform: navigatorValue.platform } : {}),
      ...(typeof navigatorValue?.onLine === 'boolean' ? { online: navigatorValue.onLine } : {}),
      sdk: Object.freeze({
        name: SDK_NAME,
        version: SDK_VERSION,
      }),
    });
  }
}
