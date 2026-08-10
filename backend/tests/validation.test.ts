import { describe, expect, it } from "vitest";

import { registerHealthWorkerSchema, wardIdParamSchema } from "../src/schemas/validation.js";

describe("registerHealthWorkerSchema", () => {
  const validInput = {
    wardId: "9c858901-8a57-4791-81fe-4c455b099bc9",
    fullName: "Amaka Obi",
    role: "chew",
    phoneNumber: "+2348012345678",
    email: "amaka@example.com",
  };

  it("accepts a valid payload", () => {
    const result = registerHealthWorkerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts a payload without email", () => {
    const { email: _email, ...withoutEmail } = validInput;
    const result = registerHealthWorkerSchema.safeParse(withoutEmail);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid ward id", () => {
    const result = registerHealthWorkerSchema.safeParse({ ...validInput, wardId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const result = registerHealthWorkerSchema.safeParse({ ...validInput, role: "farmer" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed phone number", () => {
    const result = registerHealthWorkerSchema.safeParse({ ...validInput, phoneNumber: "abc123" });
    expect(result.success).toBe(false);
  });

  it("rejects a name that is too short", () => {
    const result = registerHealthWorkerSchema.safeParse({ ...validInput, fullName: "A" });
    expect(result.success).toBe(false);
  });
});

describe("wardIdParamSchema", () => {
  it("accepts a valid uuid", () => {
    const result = wardIdParamSchema.safeParse({ wardId: "9c858901-8a57-4791-81fe-4c455b099bc9" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = wardIdParamSchema.safeParse({ wardId: "ward-1" });
    expect(result.success).toBe(false);
  });
});
