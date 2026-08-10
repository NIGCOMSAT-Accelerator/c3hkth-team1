import { describe, expect, it, vi } from "vitest";

import { createAuthMiddleware, createRequireToken, UnauthorizedError } from "../src/middleware/auth.js";
import { createFakeSupabaseClient, createFakeUserProfilesRepository, governmentProfile } from "./fakes.js";
import type { Request, Response } from "express";

function fakeReqRes(headers: Record<string, string> = {}) {
  const req = { headers, userProfile: undefined, authUserId: undefined } as unknown as Request;
  const res = {} as Response;
  return { req, res };
}

describe("createRequireToken", () => {
  it("calls next with UnauthorizedError when no header is present", async () => {
    const middleware = createRequireToken(createFakeSupabaseClient());
    const { req, res } = fakeReqRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("sets authUserId and calls next with no error on a valid token", async () => {
    const middleware = createRequireToken(createFakeSupabaseClient("user-42"));
    const { req, res } = fakeReqRes({ authorization: "Bearer valid-token" });
    const next = vi.fn();

    await middleware(req, res, next);

    expect(req.authUserId).toBe("user-42");
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with UnauthorizedError when supabase returns an error", async () => {
    const supabase = {
      auth: { getUser: async () => ({ data: { user: null }, error: { message: "expired" } }) },
    } as never;
    const middleware = createRequireToken(supabase);
    const { req, res } = fakeReqRes({ authorization: "Bearer bad-token" });
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});

describe("createAuthMiddleware", () => {
  it("attaches the resolved profile to the request", async () => {
    const middleware = createAuthMiddleware(
      createFakeSupabaseClient("auth-user-1"),
      createFakeUserProfilesRepository()
    );
    const { req, res } = fakeReqRes({ authorization: "Bearer valid-token" });
    const next = vi.fn();

    await middleware(req, res, next);

    expect(req.userProfile).toEqual(governmentProfile);
    expect(next).toHaveBeenCalledWith();
  });

  it("attaches authUserId and authEmail alongside the profile", async () => {
    const middleware = createAuthMiddleware(
      createFakeSupabaseClient("auth-user-1", "official@example.com"),
      createFakeUserProfilesRepository()
    );
    const { req, res } = fakeReqRes({ authorization: "Bearer valid-token" });
    const next = vi.fn();

    await middleware(req, res, next);

    expect(req.authUserId).toBe("auth-user-1");
    expect(req.authEmail).toBe("official@example.com");
  });

  it("calls next with UnauthorizedError when no profile exists for the user", async () => {
    const middleware = createAuthMiddleware(
      createFakeSupabaseClient("auth-user-1"),
      createFakeUserProfilesRepository({ getById: async () => null })
    );
    const { req, res } = fakeReqRes({ authorization: "Bearer valid-token" });
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
