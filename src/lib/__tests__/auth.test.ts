// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: mockSet, get: mockGet }),
}));

const SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

beforeEach(() => {
  mockSet.mockClear();
  mockGet.mockClear();
});

describe("createSession", () => {
  it("sets an httpOnly cookie", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
  });

  it("sets cookie name to auth-token", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    const [name] = mockSet.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  it("stores a valid JWT containing userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-42", "hello@example.com");

    const [, token] = mockSet.mock.calls[0];
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "development-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  it("sets cookie expiry ~7 days from now", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const expires: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("sets sameSite to lax", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
  });
});

describe("getSession", () => {
  it("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" });
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("a@b.com");
  });

  it("returns null for a malformed token", async () => {
    mockGet.mockReturnValue({ value: "not.a.jwt" });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" }, "1s");
    await new Promise((r) => setTimeout(r, 1100));
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });
});
