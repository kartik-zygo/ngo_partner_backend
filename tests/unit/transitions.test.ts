import { assertLeadTransition, assertCaseTransition, assertTicketTransition, assertCallTransition } from '@shared/domain/transitions';
import { InvalidStatusTransitionError } from '@shared/domain/errors';

describe('Status Transitions', () => {
  // ── Lead ──────────────────────────────────────────────────────────────────
  describe('Lead', () => {
    it('allows newLead -> contacted', () => {
      expect(() => assertLeadTransition('newLead', 'contacted')).not.toThrow();
    });
    it('allows contacted -> lost', () => {
      expect(() => assertLeadTransition('contacted', 'lost')).not.toThrow();
    });
    it('allows proposalSent -> qualified (negotiation fallback)', () => {
      expect(() => assertLeadTransition('proposalSent', 'qualified')).not.toThrow();
    });
    it('rejects won -> contacted', () => {
      expect(() => assertLeadTransition('won', 'contacted')).toThrow(InvalidStatusTransitionError);
    });
    it('rejects lost -> newLead', () => {
      expect(() => assertLeadTransition('lost', 'newLead')).toThrow(InvalidStatusTransitionError);
    });
    it('rejects newLead -> proposalSent (skip steps)', () => {
      expect(() => assertLeadTransition('newLead', 'proposalSent')).toThrow(InvalidStatusTransitionError);
    });
  });

  // ── Case ──────────────────────────────────────────────────────────────────
  describe('Case', () => {
    it('allows submitted -> filingInProgress', () => {
      expect(() => assertCaseTransition('submitted', 'filingInProgress')).not.toThrow();
    });
    it('allows underReview -> resubmitRequired', () => {
      expect(() => assertCaseTransition('underReview', 'resubmitRequired')).not.toThrow();
    });
    it('allows resubmitRequired -> underReview', () => {
      expect(() => assertCaseTransition('resubmitRequired', 'underReview')).not.toThrow();
    });
    it('allows any non-final -> rejected', () => {
      expect(() => assertCaseTransition('submitted', 'rejected')).not.toThrow();
      expect(() => assertCaseTransition('underReview', 'rejected')).not.toThrow();
    });
    it('rejects approved -> underReview', () => {
      expect(() => assertCaseTransition('approved', 'underReview')).toThrow(InvalidStatusTransitionError);
    });
    it('rejects rejected -> submitted', () => {
      expect(() => assertCaseTransition('rejected', 'submitted')).toThrow(InvalidStatusTransitionError);
    });
  });

  // ── Ticket ────────────────────────────────────────────────────────────────
  describe('Ticket', () => {
    it('allows open -> inProgress', () => {
      expect(() => assertTicketTransition('open', 'inProgress')).not.toThrow();
    });
    it('allows resolved -> inProgress (reopen)', () => {
      expect(() => assertTicketTransition('resolved', 'inProgress')).not.toThrow();
    });
    it('rejects closed -> open', () => {
      expect(() => assertTicketTransition('closed', 'open')).toThrow(InvalidStatusTransitionError);
    });
  });

  // ── Call ──────────────────────────────────────────────────────────────────
  describe('SupportCall', () => {
    it('allows ringing -> accepted', () => {
      expect(() => assertCallTransition('ringing', 'accepted')).not.toThrow();
    });
    it('allows ringing -> rejected', () => {
      expect(() => assertCallTransition('ringing', 'rejected')).not.toThrow();
    });
    it('allows accepted -> ended', () => {
      expect(() => assertCallTransition('accepted', 'ended')).not.toThrow();
    });
    it('rejects rejected -> accepted', () => {
      expect(() => assertCallTransition('rejected', 'accepted')).toThrow(InvalidStatusTransitionError);
    });
    it('rejects ended -> ringing', () => {
      expect(() => assertCallTransition('ended', 'ringing')).toThrow(InvalidStatusTransitionError);
    });
  });
});
