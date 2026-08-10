import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserProfilesRepository } from "../db/userProfilesRepository.js";
import type { UserProfile } from "../types/domain.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userProfile?: UserProfile;
      authUserId?: string;
      authEmail?: string;
    }
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function createRequireToken(supabase: SupabaseClient) {
  return async function requireToken(req: Request, _res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

      if (!token) {
        throw new UnauthorizedError("missing bearer token");
      }

      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedError("invalid or expired token");
      }

      req.authUserId = data.user.id;
      req.authEmail = data.user.email;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createAuthMiddleware(
  supabase: SupabaseClient,
  userProfilesRepository: UserProfilesRepository
) {
  return async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

      if (!token) {
        throw new UnauthorizedError("missing bearer token");
      }

      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedError("invalid or expired token");
      }

      const profile = await userProfilesRepository.getById(data.user.id);
      if (!profile) {
        throw new UnauthorizedError("no profile found for authenticated user");
      }

      req.userProfile = profile;
      req.authUserId = data.user.id;
      req.authEmail = data.user.email;
      next();
    } catch (error) {
      next(error);
    }
  };
}
