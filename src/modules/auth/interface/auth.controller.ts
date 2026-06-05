import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';
import { NotFoundError } from '@shared/domain/errors';

import { AuthService } from '../application/auth.service';
import { UserRepository } from '../infrastructure/user.repository';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';

const userRepo = new UserRepository();
const tokenRepo = new RefreshTokenRepository();
const authService = new AuthService(userRepo, tokenRepo);

export async function register(req: Request, res: Response): Promise<void> {
  const { user, profile, tokens } = await authService.register({
    ...(req.body as Record<string, unknown>),
    email: (req.body as { email: string }).email,
    password: (req.body as { password: string }).password,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  } as never);

  res.status(StatusCodes.CREATED).json(
    buildResponse({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
      profile,
    }),
  );
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const { user, tokens } = await authService.login({
    email,
    password,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(StatusCodes.OK).json(
    buildResponse({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    }),
  );
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  const tokens = await authService.refresh(refreshToken);
  res.status(StatusCodes.OK).json(buildResponse(tokens));
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  await authService.logout(refreshToken);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User', userId);

  const profile = await userRepo.findProfileByUserId(userId);
  res.status(StatusCodes.OK).json(buildResponse({ user: { id: user.id, email: user.email, roles: user.roles }, profile }));
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const profile = await userRepo.upsertProfile(userId, { ...req.body as Record<string, unknown>, userId });
  res.status(StatusCodes.OK).json(buildResponse({ profile }));
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  await authService.changePassword(userId, currentPassword, newPassword);
  res.status(StatusCodes.OK).json(buildResponse({ message: 'Password changed successfully. Please log in again.' }));
}
