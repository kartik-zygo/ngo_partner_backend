import { z } from 'zod';

export const createCaseSchema = z.object({
  userId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateCaseStatusSchema = z.object({
  status: z.enum(['submitted', 'filingInProgress', 'underReview', 'resubmitRequired', 'approved', 'rejected']),
  rejectionReason: z.string().max(1000).optional(),
});

export const createDocumentRequestSchema = z.object({
  round: z.number().int().min(1).optional(),
  requiredDocuments: z.array(z.string().max(255)).min(1),
  message: z.string().max(2000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
});

export const resubmitDocumentsSchema = z.object({
  requestId: z.string().uuid(),
  documents: z.array(z.object({
    documentName: z.string().max(255),
    fileUrl: z.string().url().max(1000),
    mimeType: z.string().max(100).optional(),
    fileSizeBytes: z.number().int().optional(),
  })).min(1),
});

export type CreateCaseDto = z.infer<typeof createCaseSchema>;
export type UpdateCaseStatusDto = z.infer<typeof updateCaseStatusSchema>;
export type CreateDocumentRequestDto = z.infer<typeof createDocumentRequestSchema>;
export type ResubmitDocumentsDto = z.infer<typeof resubmitDocumentsSchema>;
