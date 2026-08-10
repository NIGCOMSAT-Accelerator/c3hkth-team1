import { NotificationDeliveryError, type NotificationProvider, type NotificationResult } from "./provider.js";

interface ResendSendResponse {
  id?: string;
  message?: string;
  name?: string;
}

export function createResendEmailProvider(
  apiKey: string,
  fromAddress: string,
  subject: string
): NotificationProvider {
  return {
    async send(toEmail: string, message: string): Promise<NotificationResult> {
      let response: Response;
      try {
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: toEmail,
            subject,
            text: message,
          }),
        });
      } catch (error) {
        throw new NotificationDeliveryError("email", `failed to reach Resend: ${(error as Error).message}`);
      }

      const body = (await response.json()) as ResendSendResponse;

      if (!response.ok || !body.id) {
        throw new NotificationDeliveryError("email", body.message ?? `Resend returned status ${response.status}`);
      }

      return { providerMessageId: body.id };
    },
  };
}
