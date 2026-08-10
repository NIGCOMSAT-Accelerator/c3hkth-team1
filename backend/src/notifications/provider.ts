export interface NotificationResult {
  providerMessageId: string;
}

export class NotificationDeliveryError extends Error {
  constructor(
    readonly channel: "sms" | "whatsapp" | "email",
    message: string
  ) {
    super(message);
    this.name = "NotificationDeliveryError";
  }
}

export interface NotificationProvider {
  send(toPhoneNumber: string, message: string): Promise<NotificationResult>;
}
