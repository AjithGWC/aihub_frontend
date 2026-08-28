// Client for the OpenAI-compatible chat gateway (user.json), living at
// GATEWAY_API_BASE. It has no login of its own — callers authenticate with a
// Bearer API key (issued for the user by an admin via the Portal's key vault
// and pasted into the Chat page once), stored per portal-user-id in
// localStorage.

import { GATEWAY_API_BASE, extractErrorMessage } from '@/lib/apiBase';

const KEY_STORAGE_PREFIX = 'aihub_gw_key:';
const MODEL_STORAGE_PREFIX = 'aihub_gw_model:';

export const getGatewayKey = (userId: string): string | null =>
  localStorage.getItem(`${KEY_STORAGE_PREFIX}${userId}`);

export const setGatewayKey = (userId: string, key: string): void => {
  localStorage.setItem(`${KEY_STORAGE_PREFIX}${userId}`, key);
};

export const clearGatewayKey = (userId: string): void => {
  localStorage.removeItem(`${KEY_STORAGE_PREFIX}${userId}`);
};

/** Remembers the last model picked from the sidebar, per user — "" means Auto (default). */
export const getGatewaySelectedModel = (userId: string): string =>
  localStorage.getItem(`${MODEL_STORAGE_PREFIX}${userId}`) ?? '';

export const setGatewaySelectedModel = (userId: string, modelId: string): void => {
  localStorage.setItem(`${MODEL_STORAGE_PREFIX}${userId}`, modelId);
};

export class MissingApiKeyError extends Error {
  constructor() {
    super('No API key is connected for this account yet.');
    this.name = 'MissingApiKeyError';
  }
}

export class InvalidApiKeyError extends Error {
  constructor() {
    super('That API key was rejected — it may be invalid, revoked, or expired.');
    this.name = 'InvalidApiKeyError';
  }
}

async function gatewayFetch<T>(userId: string, path: string, init: RequestInit = {}): Promise<T> {
  const key = getGatewayKey(userId);
  if (!key) throw new MissingApiKeyError();

  const res = await fetch(`${GATEWAY_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      'X-Api-Key': key,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) throw new InvalidApiKeyError();
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.statusText || `Gateway request failed (${res.status})`));
  }
  return data as T;
}

export interface GatewayModel {
  id: string;
  object: string;
}

/** The models this specific connected key is actually entitled to use. */
export const listGatewayModels = (userId: string) =>
  gatewayFetch<{ object: string; data: GatewayModel[] }>(userId, '/v1/models');

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  // Omit entirely (rather than sending an empty/guessed string) to let the
  // gateway pick its own default route — /v1/models has been seen to
  // advertise a model id that isn't actually deployed, which 502s if sent
  // explicitly, while leaving `model` out routes to a real one.
  model?: string;
  messages: ChatMessagePayload[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

/** Response shape isn't pinned by the swagger beyond "OpenAI format" — read defensively. */
export function extractReplyText(data: any): string {
  const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
  if (typeof content === 'string' && content.trim()) return content;
  return "The model responded, but in a shape I don't recognize.";
}

export const chatCompletion = (userId: string, body: ChatCompletionRequest) =>
  gatewayFetch<any>(userId, '/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
