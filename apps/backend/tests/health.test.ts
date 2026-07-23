import { describe, expect, test } from 'bun:test';

import app from '../src/app';

describe('Health endpoint', () => {
  test('GET /api/v1/health should return 200 OK', async () => {
    const response = await app.request('/api/v1/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
  });
});
