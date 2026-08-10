import { Router } from "express";

import type { WardsRepository } from "../db/wardsRepository.js";

export function createPublicReferenceRouter(wardsRepository: WardsRepository): Router {
  const router = Router();

  router.get("/wards", async (_req, res, next) => {
    try {
      const wards = await wardsRepository.listWards({ role: "government", lgaId: null, wardId: null });
      res.json({ data: wards });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
