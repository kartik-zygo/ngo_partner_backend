import { Router } from 'express';

import { authenticate } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';

import { changePasswordSchema, loginSchema, refreshSchema, registerSchema, updateProfileSchema } from '../application/auth.schemas';
import * as ctrl from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), ctrl.register);
authRouter.post('/login', validate(loginSchema), ctrl.login);
authRouter.post('/refresh', validate(refreshSchema), ctrl.refresh);
authRouter.post('/logout', validate(refreshSchema), ctrl.logout);
authRouter.get('/me', authenticate, ctrl.me);
authRouter.patch('/me/profile', authenticate, validate(updateProfileSchema), ctrl.updateProfile);
authRouter.patch('/me/password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
