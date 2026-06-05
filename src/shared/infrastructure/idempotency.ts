import { v4 as uuidv4 } from 'uuid';

import { db } from './database';

/**
 * Checks the idempotency_keys table.
 * Returns the cached response if the key was already processed,
 * or null if it's new (and inserts a placeholder row for the caller to update).
 */
export async function checkIdempotency(
  actorId: string,
  actionKey: string,
): Promise<{ alreadyProcessed: boolean; cachedResponse?: unknown }> {
  const existing = await db('idempotency_keys')
    .where({ actor_id: actorId, action_key: actionKey })
    .first<{ response_payload: unknown; status: string } | undefined>();

  if (existing) {
    return {
      alreadyProcessed: true,
      cachedResponse: existing.response_payload,
    };
  }

  return { alreadyProcessed: false };
}

export async function storeIdempotencyResult(
  actorId: string,
  actionKey: string,
  responsePayload: unknown,
): Promise<void> {
  await db('idempotency_keys')
    .insert({
      id: uuidv4(),
      actor_id: actorId,
      action_key: actionKey,
      response_payload: JSON.stringify(responsePayload),
      status: 'completed',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h TTL
    })
    .onConflict(['actor_id', 'action_key'])
    .ignore();
}
