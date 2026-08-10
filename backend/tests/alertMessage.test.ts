import { describe, expect, it } from "vitest";

import { buildAlertMessage } from "../src/services/alertMessage.js";

describe("buildAlertMessage", () => {
  it("builds a high-risk message with an action recommendation", () => {
    const message = buildAlertMessage("Adankolo", "high", 0.82);

    expect(message).toContain("Adankolo");
    expect(message).toContain("HIGH");
    expect(message).toContain("82%");
    expect(message).toContain("Prepare nets and larvicide");
  });

  it("builds a moderate-risk message", () => {
    const message = buildAlertMessage("Adankolo", "moderate", 0.5);

    expect(message).toContain("MODERATE");
    expect(message).toContain("50%");
  });

  it("builds a low-risk message with no action needed", () => {
    const message = buildAlertMessage("Adankolo", "low", 0.1);

    expect(message).toContain("LOW");
    expect(message).toContain("No action needed");
  });
});
