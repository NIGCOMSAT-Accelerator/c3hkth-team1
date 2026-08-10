import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationDeliveryError } from "../src/notifications/provider.js";
import { createTwilioWhatsAppProvider } from "../src/notifications/twilioWhatsAppProvider.js";

describe("createTwilioWhatsAppProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the message sid on success and sends whatsapp-prefixed addresses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTwilioWhatsAppProvider("AC123", "secret", "whatsapp:+14155238886");
    const result = await provider.send("+2348012345678", "hello");

    expect(result.providerMessageId).toBe("SM123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json");
    expect((init.body as string)).toContain("To=whatsapp%3A%2B2348012345678");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
  });

  it("does not double-prefix an already whatsapp-prefixed number", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sid: "SM123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTwilioWhatsAppProvider("AC123", "secret", "whatsapp:+14155238886");
    await provider.send("whatsapp:+2348012345678", "hello");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.body as string)).toContain("To=whatsapp%3A%2B2348012345678");
    expect((init.body as string)).not.toContain("whatsapp%3Awhatsapp");
  });

  it("throws NotificationDeliveryError when the response has no sid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const provider = createTwilioWhatsAppProvider("AC123", "secret", "whatsapp:+14155238886");

    await expect(provider.send("+2348012345678", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });

  it("throws NotificationDeliveryError when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const provider = createTwilioWhatsAppProvider("AC123", "secret", "whatsapp:+14155238886");

    await expect(provider.send("+2348012345678", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });
});
