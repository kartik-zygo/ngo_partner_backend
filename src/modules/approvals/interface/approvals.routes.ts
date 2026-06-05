import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam, paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';
import { StatusCodes } from 'http-status-codes';

import {
  createApprovalSchema,
  approvalDecisionSchema,
  listApprovals,
  createApproval,
  decideApproval,
} from '../application/approvals.service';
import type { Request, Response } from 'express';

export const approvalsRouter = Router();

approvalsRouter.use(authenticate);

approvalsRouter.get('/', authorize('SALES', 'ADMIN'), async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const { status } = req.query as { status?: string };
  const result = await listApprovals({ page, limit }, status);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});

approvalsRouter.post('/', validate(createApprovalSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.CREATED).json(buildResponse(await createApproval(req.body as Parameters<typeof createApproval>[0], req.user!.sub)));
});

approvalsRouter.patch('/:id/decision', authorize('ADMIN'), validate(uuidParam, 'params'), validate(approvalDecisionSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(buildResponse(await decideApproval(req.params['id']!, req.body as Parameters<typeof decideApproval>[1], req.user!.sub)));
});
