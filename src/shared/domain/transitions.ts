import {
  CALL_TRANSITIONS,
  CASE_TRANSITIONS,
  LEAD_TRANSITIONS,
  TICKET_TRANSITIONS,
} from './constants';
import { InvalidStatusTransitionError } from './errors';
import type { CallStatus, CaseStatus, LeadStatus, TicketStatus } from './constants';

function assertTransition<T extends string>(
  transitions: Record<T, T[]>,
  from: T,
  to: T,
  entity: string,
): void {
  const allowed = transitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidStatusTransitionError(from, to, entity);
  }
}

export const assertLeadTransition = (from: LeadStatus, to: LeadStatus): void =>
  assertTransition(LEAD_TRANSITIONS, from, to, 'lead');

export const assertCaseTransition = (from: CaseStatus, to: CaseStatus): void =>
  assertTransition(CASE_TRANSITIONS, from, to, 'case');

export const assertTicketTransition = (from: TicketStatus, to: TicketStatus): void =>
  assertTransition(TICKET_TRANSITIONS, from, to, 'ticket');

export const assertCallTransition = (from: CallStatus, to: CallStatus): void =>
  assertTransition(CALL_TRANSITIONS, from, to, 'support_call');
