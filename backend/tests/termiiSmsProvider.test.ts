import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationDeliveryError } from "../src/notifications/provider.js";
import { createTermiiSmsProvider } from "../src/notifications/termiiSmsProvider.js";

describe("createTermiiSmsProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the provider message id on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: "termii-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTermiiSmsProvider("key", "AquaWatch", "https://api.ns.termii.com");
    const result = await provider.send("+2348012345678", "hello");

    expect(result.providerMessageId).toBe("termii-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ns.termii.com/api/sms/send",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws NotificationDeliveryError when the response has no message_id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    );

    const provider = createTermiiSmsProvider("key", "AquaWatch", "https://api.ns.termii.com");

    await expect(provider.send("+2348012345678", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });

  it("throws NotificationDeliveryError when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: "bad request" }) })
    );

    const provider = createTermiiSmsProvider("key", "AquaWatch", "https://api.ns.termii.com");

    await expect(provider.send("+2348012345678", "hello")).rejects.toThrow("bad request");
  });

  it("throws NotificationDeliveryError when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("dns failure")));

    const provider = createTermiiSmsProvider("key", "AquaWatch", "https://api.ns.termii.com");

    await expect(provider.send("+2348012345678", "hello")).rejects.toBeInstanceOf(
      NotificationDeliveryError
    );
  });
});
