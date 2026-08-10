import { NotificationDeliveryError, type NotificationProvider, type NotificationResult } from "./provider.js";

interface TwilioMessageResponse {
  sid?: string;
  message?: string;
}

function toWhatsAppAddress(phoneNumber: string): string {
  return phoneNumber.startsWith("whatsapp:") ? phoneNumber : `whatsapp:${phoneNumber}`;
}

export function createTwilioWhatsAppProvider(
  accountSid: string,
  authToken: string,
  fromAddress: string
): NotificationProvider {
  return {
    async send(toPhoneNumber: string, message: string): Promise<NotificationResult> {
      const body = new URLSearchParams({
        From: toWhatsAppAddress(fromAddress),
        To: toWhatsAppAddress(toPhoneNumber),
        Body: message,
      });

      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      let response: Response;
      try {
        response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          }
        );
      } catch (error) {
        throw new NotificationDeliveryError("whatsapp", `failed to reach Twilio: ${(error as Error).message}`);
      }

      const responseBody = (await response.json()) as TwilioMessageResponse;

      if (!response.ok || !responseBody.sid) {
        throw new NotificationDeliveryError(
          "whatsapp",
          responseBody.message ?? `Twilio returned status ${response.status}`
        );
      }

      return { providerMessageId: responseBody.sid };
    },
  };
}
