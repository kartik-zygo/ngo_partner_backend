export type Role = 'USER' | 'SALES' | 'ADMIN';

export const ROLES: Record<Role, Role> = {
  USER: 'USER',
  SALES: 'SALES',
  ADMIN: 'ADMIN',
};

// ── Lead ──────────────────────────────────────────────────────────────────────
export type LeadStatus = 'newLead' | 'contacted' | 'qualified' | 'proposalSent' | 'won' | 'lost';
export type LeadSource = 'userApp' | 'manual' | 'campaign' | 'collaboration';

// ── Case ──────────────────────────────────────────────────────────────────────
export type CaseStatus =
  | 'submitted'
  | 'filingInProgress'
  | 'underReview'
  | 'resubmitRequired'
  | 'approved'
  | 'rejected';

// ── Support Ticket ────────────────────────────────────────────────────────────
export type TicketStatus = 'open' | 'inProgress' | 'waitingForUser' | 'resolved' | 'closed';

// ── Support Call ──────────────────────────────────────────────────────────────
export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended';
export type CallTargetTeam = 'support' | 'sales';

// ── Collaboration ─────────────────────────────────────────────────────────────
export type CollaborationStatus = 'pending' | 'approved' | 'rejected';
export type CollaborationType =
  | 'fundingPartner'
  | 'resourceSharing'
  | 'csrPartner'
  | 'technical';

// ── Approval ──────────────────────────────────────────────────────────────────
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ── Follow-up Task ────────────────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'completed' | 'rescheduled';

// ── Integration Event Names ───────────────────────────────────────────────────
export type IntegrationEventName =
  | 'userActionReceived'
  | 'leadCreatedFromUserAction'
  | 'leadAssigned'
  | 'caseStatusSynced'
  | 'documentRequested'
  | 'documentResubmitted'
  | 'userNotificationQueued';

// ── Status Transition Maps ────────────────────────────────────────────────────
export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  newLead: ['contacted', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['proposalSent', 'lost'],
  proposalSent: ['won', 'lost', 'qualified'],
  won: [],
  lost: [],
};

export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  submitted: ['filingInProgress', 'rejected'],
  filingInProgress: ['underReview', 'rejected'],
  underReview: ['resubmitRequired', 'approved', 'rejected'],
  resubmitRequired: ['underReview', 'rejected'],
  approved: [],
  rejected: [],
};

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['inProgress', 'closed'],
  inProgress: ['waitingForUser', 'resolved', 'closed'],
  waitingForUser: ['inProgress', 'resolved', 'closed'],
  resolved: ['inProgress', 'closed'],
  closed: [],
};

export const CALL_TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  ringing: ['accepted', 'rejected', 'ended'],
  accepted: ['ended'],
  rejected: [],
  ended: [],
};
