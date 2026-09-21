import { describe, expect, it } from 'vitest';

import { queryString } from './client';

describe('API query serialization', () => {
  it('omits undefined filters and encodes route names', () => {
    expect(queryString({ environment: 'production', routeName: 'user detail', metric: undefined })).toBe(
      '?environment=production&routeName=user+detail',
    );
  });
});

