import { NotificationDeliveryError, type NotificationProvider, type NotificationResult } from "./provider.js";

interface TermiiSendResponse {
  message_id?: string;
  message?: string;
  code?: string;
}

export function createTermiiSmsProvider(
  apiKey: string,
  senderId: string,
  baseUrl: string
): NotificationProvider {
  return {
    async send(toPhoneNumber: string, message: string): Promise<NotificationResult> {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/api/sms/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            to: toPhoneNumber,
            from: senderId,
            sms: message,
            type: "plain",
            channel: "generic",
          }),
        });
      } catch (error) {
        throw new NotificationDeliveryError("sms", `failed to reach Termii: ${(error as Error).message}`);
      }

      const body = (await response.json()) as TermiiSendResponse;

      if (!response.ok || !body.message_id) {
        throw new NotificationDeliveryError(
          "sms",
          body.message ?? `Termii returned status ${response.status}`
        );
      }

      return { providerMessageId: body.message_id };
    },
  };
}
