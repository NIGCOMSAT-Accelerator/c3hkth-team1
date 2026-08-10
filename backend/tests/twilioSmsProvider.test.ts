import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationDeliveryError } from "../src/notifications/provider.js";
import { createTwilioSmsProvider } from "../src/notifications/twilioSmsProvider.js";

describe("createTwilioSmsProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the message sid on success and sends plain phone number addresses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM456" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTwilioSmsProvider("AC123", "secret", "+15005550006");
    const result = await provider.send("+2348012345678", "hello");

    expect(result.providerMessageId).toBe("SM456");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json");
    expect(init.body as string).toContain("To=%2B2348012345678");
    expect(init.body as string).toContain("From=%2B15005550006");
    expect(init.body as string).not.toContain("whatsapp");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
  });

  it("throws NotificationDeliveryError when the response has no sid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const provider = createTwilioSmsProvider("AC123", "secret", "+15005550006");

    await expect(provider.send("+2348012345678", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });

  it("throws NotificationDeliveryError with the Twilio error message when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: "unverified number" }) })
    );

    const provider = createTwilioSmsProvider("AC123", "secret", "+15005550006");

    await expect(provider.send("+2348012345678", "hello")).rejects.toThrow("unverified number");
  });

  it("throws NotificationDeliveryError when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const provider = createTwilioSmsProvider("AC123", "secret", "+15005550006");

    await expect(provider.send("+2348012345678", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });
});
