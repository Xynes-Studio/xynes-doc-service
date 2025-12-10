import { describe, expect, test } from "bun:test";
import app from "../src/app";
import { config } from "../src/infra/config";
import { DomainError } from "@xynes/errors";
import { Hono } from "hono";

describe("Infrastructure Config", () => {
    test("Config loads with defaults", () => {
        expect(config.server.PORT).toBeDefined();
        expect(config.server.DATABASE_URL).toBeDefined();
    });
});

describe("Hono App Integration", () => {
    test("GET /health returns 200 OK", async () => {
        const res = await app.request("/health");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ status: "ok" });
    });

    test("Error Handler catches DomainError", async () => {
        // Create a temporary app extending the main one for testing error route
        const testApp = new Hono();
        testApp.route("/", app);
        testApp.get("/error-test", () => {
             throw new DomainError("Something went wrong", "TEST_ERROR", 418);
        });
        
        // We need to register the error handler again or just use app if we can add routes dynamically,
        // but Hono apps are immutable-ish in structure. 
        // Better: Just test the error handler logic or add a route to main app if possible?
        // Actually, we can just use the middleware directly or mount app.
        // Let's rely on app.onError being propagated if we mount 'app' as sub-app, 
        // BUT app.onError is app-specific.
        
        // Alternative: Mock the router or inject a route? 
        // Easier: Just unit test the middleware function or create a fresh app instance with same middleware + bad route.
        const errorApp = new Hono();
        // Import errorHandler directly
        const { errorHandler } = await import("../src/middleware/error-handler");
        errorApp.onError(errorHandler);
        errorApp.get("/fail", () => {
            throw new DomainError("Test Message", "TEST_CODE", 400);
        });

        const res = await errorApp.request("/fail");
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({
            error: {
                code: "TEST_CODE",
                message: "Test Message",
            },
        });
    });
});
