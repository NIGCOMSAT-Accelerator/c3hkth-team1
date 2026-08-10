import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ML_SERVICE_URL: z.string().url(),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ALERT_TRIGGER_THRESHOLD: z.coerce.number().min(0).max(1).default(0.66),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  TERMII_API_KEY: z.string().default(""),
  TERMII_SENDER_ID: z.string().default("AquaWatch"),
  TERMII_BASE_URL: z.string().url().default("https://api.ns.termii.com"),
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_WHATSAPP_FROM: z.string().default("whatsapp:+14155238886"),
  TWILIO_SMS_FROM: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),
  RESEND_FROM_EMAIL: z.string().default("alerts@aquawatch.ng"),
  CRON_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  CRON_SCHEDULE: z.string().default("0 */6 * * *"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`invalid environment configuration: ${issues}`);
  }

  return result.data;
}
