import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationDeliveryError } from "../src/notifications/provider.js";
import { createResendEmailProvider } from "../src/notifications/resendEmailProvider.js";

describe("createResendEmailProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the provider message id on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "resend-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendEmailProvider("key", "alerts@aquawatch.ng", "AquaWatch Alert");
    const result = await provider.send("worker@example.com", "hello");

    expect(result.providerMessageId).toBe("resend-123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key");
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("worker@example.com");
    expect(body.from).toBe("alerts@aquawatch.ng");
    expect(body.subject).toBe("AquaWatch Alert");
    expect(body.text).toBe("hello");
  });

  it("throws NotificationDeliveryError when the response has no id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const provider = createResendEmailProvider("key", "alerts@aquawatch.ng", "AquaWatch Alert");

    await expect(provider.send("worker@example.com", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });

  it("throws NotificationDeliveryError when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "invalid recipient" }) })
    );

    const provider = createResendEmailProvider("key", "alerts@aquawatch.ng", "AquaWatch Alert");

    await expect(provider.send("bad-email", "hello")).rejects.toThrow("invalid recipient");
  });

  it("throws NotificationDeliveryError when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const provider = createResendEmailProvider("key", "alerts@aquawatch.ng", "AquaWatch Alert");

    await expect(provider.send("worker@example.com", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });
});
