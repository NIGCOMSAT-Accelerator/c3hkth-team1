import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createAlertsRepository } from "./db/alertsRepository.js";
import { createAuditLogsRepository } from "./db/auditLogsRepository.js";
import { createHealthWorkersRepository } from "./db/healthWorkersRepository.js";
import { createDbPool } from "./db/pool.js";
import { createUserProfilesRepository } from "./db/userProfilesRepository.js";
import { createWardsRepository } from "./db/wardsRepository.js";
import { runScheduledAlertCheck } from "./jobs/scheduledAlertCheck.js";
import { createResendEmailProvider } from "./notifications/resendEmailProvider.js";
import { createTwilioSmsProvider } from "./notifications/twilioSmsProvider.js";
import { createTwilioWhatsAppProvider } from "./notifications/twilioWhatsAppProvider.js";
import { createAlertService } from "./services/alertService.js";
import { createRiskService } from "./services/riskService.js";

const env = loadEnv();
const pool = createDbPool(env.DATABASE_URL);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const wardsRepository = createWardsRepository(pool);
const healthWorkersRepository = createHealthWorkersRepository(pool);
const alertsRepository = createAlertsRepository(pool);
const auditLogsRepository = createAuditLogsRepository(pool);
const userProfilesRepository = createUserProfilesRepository(pool);
const riskService = createRiskService(env.ML_SERVICE_URL, env.ML_SERVICE_TIMEOUT_MS);

const alertService = createAlertService({
  healthWorkersRepository,
  alertsRepository,
  userProfilesRepository,
  riskService,
  smsProvider: createTwilioSmsProvider(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_SMS_FROM),
  whatsAppProvider: createTwilioWhatsAppProvider(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_AUTH_TOKEN,
    env.TWILIO_WHATSAPP_FROM
  ),
  emailProvider: createResendEmailProvider(
    env.RESEND_API_KEY,
    env.RESEND_FROM_EMAIL,
    "AquaWatch Malaria Risk Alert"
  ),
  defaultTriggerThreshold: env.ALERT_TRIGGER_THRESHOLD,
});

const app = createApp({
  wardsRepository,
  healthWorkersRepository,
  alertsRepository,
  userProfilesRepository,
  auditLogsRepository,
  riskService,
  alertService,
  supabase,
});

app.listen(env.PORT, () => {
  console.log(`aquawatch backend listening on port ${env.PORT}`);
});

if (env.CRON_ENABLED) {
  cron.schedule(env.CRON_SCHEDULE, async () => {
    console.log(`scheduled alert check starting (${new Date().toISOString()})`);
    const summary = await runScheduledAlertCheck({ wardsRepository, alertService, auditLogsRepository });
    console.log("scheduled alert check complete:", summary);
  });
  console.log(`scheduled alert automation enabled, cron: ${env.CRON_SCHEDULE}`);
} else {
  console.log("scheduled alert automation disabled (CRON_ENABLED=false)");
}
