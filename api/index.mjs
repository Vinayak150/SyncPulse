/**
 * SyncPulse11 V5.5 — Serverless / Edge API Entrypoint (Vercel / Cloud Functions)
 * Module: api/index.mjs
 *
 * Delegates all `/api/*` requests (`/api/health`, `/api/live/matches`, `/api/live/state`,
 * `/api/live/delivery`, `/api/live/autostream`, `/api/live/reset`, `/api/live/stream`,
 * `/api/quant/evaluate`, `/api/ai/grok`) to the shared SyncPulse11 HTTP request handler.
 */

import { createSyncPulseHttpServer } from '../src/server/liveTelemetryServer.mjs';

const { server } = createSyncPulseHttpServer();

export default function handler(req, res) {
  server.emit('request', req, res);
}
