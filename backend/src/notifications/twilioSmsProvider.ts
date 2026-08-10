import { NotificationDeliveryError, type NotificationProvider, type NotificationResult } from "./provider.js";

interface TwilioMessageResponse {
  sid?: string;
  message?: string;
}

export function createTwilioSmsProvider(
  accountSid: string,
  authToken: string,
  fromNumber: string
): NotificationProvider {
  return {
    async send(toPhoneNumber: string, message: string): Promise<NotificationResult> {
      const body = new URLSearchParams({
        From: fromNumber,
        To: toPhoneNumber,
        Body: message,
      });

      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      let response: Response;
      try {
        response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });
      } catch (error) {
        throw new NotificationDeliveryError("sms", `failed to reach Twilio: ${(error as Error).message}`);
      }

      const responseBody = (await response.json()) as TwilioMessageResponse;

      if (!response.ok || !responseBody.sid) {
        throw new NotificationDeliveryError(
          "sms",
          responseBody.message ?? `Twilio returned status ${response.status}`
        );
      }

      return { providerMessageId: responseBody.sid };
    },
  };
}
