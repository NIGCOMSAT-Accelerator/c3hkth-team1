import { z } from "zod";

export const registerHealthWorkerSchema = z.object({
  wardId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(200),
  role: z.enum(["chew", "lga_coordinator", "state_official"]),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "phoneNumber must be a valid phone number"),
  email: z.string().trim().email().optional().nullable(),
});

export type RegisterHealthWorkerInput = z.infer<typeof registerHealthWorkerSchema>;

export const wardIdParamSchema = z.object({
  wardId: z.string().uuid(),
});

export const updateThresholdSchema = z.object({
  alertThreshold: z.number().min(0).max(1).nullable(),
});

export const createProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200),
    role: z.enum(["government", "lga_official", "ward_official"]),
    lgaId: z.string().uuid().optional().nullable(),
    wardId: z.string().uuid().optional().nullable(),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{10,15}$/, "phoneNumber must be a valid phone number")
      .optional()
      .nullable(),
    isWhatsappCapable: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "lga_official" && !value.lgaId) {
      ctx.addIssue({ code: "custom", message: "lgaId is required for lga_official", path: ["lgaId"] });
    }
    if (value.role === "ward_official" && !value.wardId) {
      ctx.addIssue({ code: "custom", message: "wardId is required for ward_official", path: ["wardId"] });
    }
    if ((value.role === "lga_official" || value.role === "ward_official") && !value.phoneNumber) {
      ctx.addIssue({
        code: "custom",
        message: "phoneNumber is required to receive alerts for this role",
        path: ["phoneNumber"],
      });
    }
  });

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(["sms", "whatsapp", "email"]).optional(),
  status: z.enum(["sent", "failed"]).optional(),
  wardId: z.string().uuid().optional(),
});

export const refreshRiskBatchSchema = z.object({
  wardIds: z.array(z.string().uuid()).min(1).max(50),
});
