import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import { requireInternalServiceAuth } from "../src/middleware/internal-service-auth";

describe("requireInternalServiceAuth (unit)", () => {
  const token = "unit-test-token";
  let originalToken: string | undefined;

  beforeEach(() => {
    originalToken = process.env.INTERNAL_SERVICE_TOKEN;
    process.env.INTERNAL_SERVICE_TOKEN = token;
  });

  afterEach(() => {
    // Restore original token to avoid affecting other tests
    if (originalToken !== undefined) {
      process.env.INTERNAL_SERVICE_TOKEN = originalToken;
    } else {
      delete process.env.INTERNAL_SERVICE_TOKEN;
    }
  });

  it("returns 401 when header missing and does not run handler", async () => {
    const app = new Hono();
    let ran = false;
    app.use("*", requireInternalServiceAuth());
    app.post("/internal/doc-actions", (c) => {
      ran = true;
      return c.json({ ok: true });
    });

    const res = await app.request("/internal/doc-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    expect(ran).toBe(false);
  });

  it("returns 403 when header mismatched and does not run handler", async () => {
    const app = new Hono();
    let ran = false;
    app.use("*", requireInternalServiceAuth());
    app.post("/internal/doc-actions", (c) => {
      ran = true;
      return c.json({ ok: true });
    });

    const res = await app.request("/internal/doc-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Service-Token": "wrong-token",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    expect(ran).toBe(false);
  });

  it("allows request when header matches", async () => {
    const app = new Hono();
    let ran = false;
    app.use("*", requireInternalServiceAuth());
    app.post("/internal/doc-actions", (c) => {
      ran = true;
      return c.json({ ok: true });
    });

    const res = await app.request("/internal/doc-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Service-Token": token,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    expect(ran).toBe(true);
  });
});
