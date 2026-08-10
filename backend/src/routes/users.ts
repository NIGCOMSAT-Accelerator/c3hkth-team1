import { Router } from "express";

import { UnauthorizedError } from "../middleware/auth.js";
import type { AuditLogsRepository } from "../db/auditLogsRepository.js";
import type { HealthWorkersRepository } from "../db/healthWorkersRepository.js";
import type { UserProfilesRepository } from "../db/userProfilesRepository.js";
import type { WardsRepository } from "../db/wardsRepository.js";
import { createProfileSchema, updateThresholdSchema } from "../schemas/validation.js";

async function registerAsHealthWorker(
  wardsRepository: WardsRepository,
  healthWorkersRepository: HealthWorkersRepository,
  input: {
    role: "government" | "lga_official" | "ward_official";
    lgaId?: string | null;
    wardId?: string | null;
    fullName: string;
    phoneNumber?: string | null;
    isWhatsappCapable?: boolean;
  },
  email: string | undefined
): Promise<void> {
  if (!input.phoneNumber) {
    return;
  }

  const whatsappCapable = input.isWhatsappCapable ?? true;

  if (input.role === "ward_official" && input.wardId) {
    await healthWorkersRepository.register({
      wardId: input.wardId,
      fullName: input.fullName,
      role: "chew",
      phoneNumber: input.phoneNumber,
      email: email ?? null,
      whatsappCapable,
    });
    return;
  }

  if (input.role === "lga_official" && input.lgaId) {
    const wardsInLga = await wardsRepository.listWards({
      role: "lga_official",
      lgaId: input.lgaId,
      wardId: null,
    });

    for (const ward of wardsInLga) {
      await healthWorkersRepository.register({
        wardId: ward.id,
        fullName: input.fullName,
        role: "lga_coordinator",
        phoneNumber: input.phoneNumber,
        email: email ?? null,
        whatsappCapable,
      });
    }
  }
}

export function createUsersRouter(
  userProfilesRepository: UserProfilesRepository,
  healthWorkersRepository: HealthWorkersRepository,
  wardsRepository: WardsRepository,
  auditLogsRepository: AuditLogsRepository
): Router {
  const router = Router();

  router.post("/profile", async (req, res, next) => {
    try {
      if (!req.authUserId) {
        throw new UnauthorizedError("missing authenticated user id");
      }

      const input = createProfileSchema.parse(req.body);
      const profile = await userProfilesRepository.upsert({
        id: req.authUserId,
        fullName: input.fullName,
        role: input.role,
        lgaId: input.lgaId ?? null,
        wardId: input.wardId ?? null,
        phoneNumber: input.phoneNumber ?? null,
        isWhatsappCapable: input.isWhatsappCapable ?? true,
      });

      await registerAsHealthWorker(wardsRepository, healthWorkersRepository, input, req.authEmail);

      await auditLogsRepository.record({
        actorId: req.authUserId,
        actorEmail: req.authEmail ?? null,
        action: "profile.upserted",
        targetType: "user_profile",
        targetId: req.authUserId,
        metadata: { role: input.role, lgaId: input.lgaId ?? null, wardId: input.wardId ?? null },
      });

      res.status(201).json({ data: profile });
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", async (req, res, next) => {
    try {
      if (!req.authUserId) {
        throw new UnauthorizedError("missing authenticated user id");
      }

      const profile = await userProfilesRepository.getById(req.authUserId);
      res.json({ data: profile });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/threshold", async (req, res, next) => {
    try {
      if (!req.authUserId) {
        throw new UnauthorizedError("missing authenticated user id");
      }

      const input = updateThresholdSchema.parse(req.body);
      const profile = await userProfilesRepository.updateThreshold(req.authUserId, input.alertThreshold);

      await auditLogsRepository.record({
        actorId: req.authUserId,
        actorEmail: req.authEmail ?? null,
        action: "threshold.updated",
        targetType: "user_profile",
        targetId: req.authUserId,
        metadata: { alertThreshold: input.alertThreshold },
      });

      res.json({ data: profile });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
