import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { StatusCodes } from 'http-status-codes';

import { config } from '@shared/config/env';
import { AppError } from '@shared/domain/errors';

import { getCall } from './support-calls.service';

// UID 1 = call initiator (user side), UID 2 = joining agent (staff side)
const UID_INITIATOR = 1;
const UID_AGENT = 2;

export async function getAgoraToken(callId: string, requesterId: string) {
  const call = await getCall(callId);

  if (!['ringing', 'accepted'].includes(call.status)) {
    throw new AppError(
      'Agora token can only be requested for active calls (ringing or accepted)',
      StatusCodes.UNPROCESSABLE_ENTITY,
      'CALL_NOT_ACTIVE',
    );
  }

  if (!config.AGORA_APP_ID || !config.AGORA_APP_CERTIFICATE) {
    throw new AppError(
      'Voice/video calls are not configured on this server',
      StatusCodes.SERVICE_UNAVAILABLE,
      'AGORA_NOT_CONFIGURED',
    );
  }

  const uid = call.userId === requesterId ? UID_INITIATOR : UID_AGENT;
  const channelName = callId;

  const token = RtcTokenBuilder.buildTokenWithUid(
    config.AGORA_APP_ID,
    config.AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    config.AGORA_TOKEN_EXPIRY_SECONDS,
    0,
  );

  return {
    token,
    channelName,
    uid,
    appId: config.AGORA_APP_ID,
    callType: call.callType,
    expiresInSeconds: config.AGORA_TOKEN_EXPIRY_SECONDS,
  };
}
