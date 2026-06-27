import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";
import { loginAs } from "@/e2e/helpers/auth";
import { stdout } from "process";


test.describe("Tokens POST Token", () => {

    test("TOK-001: create API token with 7-day expiration", async ({request,baseURL,}) => {
        
        const tokenName = `tok001-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: { 
                name: tokenName,
                expires: 0,
            },
        });

        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.response).toHaveProperty("secretKey");
        expect(body.response).toHaveProperty("token");
        expect(body.response.token).toHaveProperty("name", tokenName);

        const expiryDate = new Date(body.response.token.expires);
        const now = Date.now();
        expect(expiryDate.getTime()).toBeGreaterThan(now + 6 * 24 * 60 * 60 * 1000);
        expect(expiryDate.getTime()).toBeLessThan(now + 8 * 24 * 60 * 60 * 1000);

        await authenticatedUser.context.dispose();
    });

    test("TOK-002: create token with never expiration", async ({ request, baseURL }) => {
        
        const tokenName = `tok002-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 4,
            },
        });

        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.response).toHaveProperty("secretKey");
        expect(body.response).toHaveProperty("token");
        expect(body.response.token).toHaveProperty("name", tokenName);

        const expiryDate = new Date(body.response.token.expires);
        const now = Date.now();
        const minExpected = now + 180 * 365 * 24 * 60 * 60 * 1000;
        const maxExpected = now + 220 * 365 * 24 * 60 * 60 * 1000;

        expect(expiryDate.getTime()).toBeGreaterThan(minExpected);
        expect(expiryDate.getTime()).toBeLessThan(maxExpected);

        await authenticatedUser.context.dispose();
    });

    test("TOK-003: create token with one-month expiration", async ({ baseURL }) => {
        const tokenName = `tok003-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 1,
            },
        });

        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.response).toHaveProperty("secretKey");
        expect(body.response).toHaveProperty("token");
        expect(body.response.token).toHaveProperty("name", tokenName);

        const expiryDate = new Date(body.response.token.expires);
        const now = Date.now();
        const minExpected = now + 29 * 24 * 60 * 60 * 1000;
        const maxExpected = now + 31 * 24 * 60 * 60 * 1000;

        expect(expiryDate.getTime()).toBeGreaterThan(minExpected);
        expect(expiryDate.getTime()).toBeLessThan(maxExpected);

        await authenticatedUser.context.dispose();
    });

    test("TOK-004: create token with two-month expiration", async ({ baseURL }) => {
        const tokenName = `tok004-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 2,
            },
        });

        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.response).toHaveProperty("secretKey");
        expect(body.response).toHaveProperty("token");
        expect(body.response.token).toHaveProperty("name", tokenName);

        const expiryDate = new Date(body.response.token.expires);
        const now = Date.now();
        const minExpected = now + 59 * 24 * 60 * 60 * 1000;
        const maxExpected = now + 61 * 24 * 60 * 60 * 1000;

        expect(expiryDate.getTime()).toBeGreaterThan(minExpected);
        expect(expiryDate.getTime()).toBeLessThan(maxExpected);

        await authenticatedUser.context.dispose();
    });

    test("TOK-005: create token with three-month expiration", async ({ baseURL }) => {
        const tokenName = `tok005-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 3,
            },
        });

        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.response).toHaveProperty("secretKey");
        expect(body.response).toHaveProperty("token");
        expect(body.response.token).toHaveProperty("name", tokenName);

        const expiryDate = new Date(body.response.token.expires);
        const now = Date.now();
        const minExpected = now + 89 * 24 * 60 * 60 * 1000;
        const maxExpected = now + 91 * 24 * 60 * 60 * 1000;

        expect(expiryDate.getTime()).toBeGreaterThan(minExpected);
        expect(expiryDate.getTime()).toBeLessThan(maxExpected);

        await authenticatedUser.context.dispose();
    });

    test("TOK-006: response includes a non-empty JWT secretKey", async ({ baseURL }) => {
        const tokenName = `tok006-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });

        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.response).toHaveProperty("secretKey");
        expect(typeof body.response.secretKey).toBe("string");
        expect(body.response.secretKey.length).toBeGreaterThan(0);

        await authenticatedUser.context.dispose();
    });

    test("TOK-011: reject duplicate active token name", async ({ baseURL }) => {
        const tokenName = `tok011-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const firstResponse = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });

        const firstBody = await firstResponse.json();

        expect(firstResponse.status()).toBe(200);
        expect(firstBody.response).toHaveProperty("token");
        expect(firstBody.response.token.revoked).toBe(false);

        const secondResponse = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });

        const secondBody = await secondResponse.json();

        expect(secondResponse.status()).toBe(400);
        expect(secondBody.response).toContain("Token with that name already exists");

        await authenticatedUser.context.dispose();
    });

    test("TOK-012: reject empty token name", async ({ request, baseURL }) => {
        const tokenName = '';
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });

        const body = await response.json();
        stdout.write(`Response body: ${JSON.stringify(body)}\n`);

        expect(response.status()).toBe(400);
        expect(body.response).toContain("Required");

        await authenticatedUser.context.dispose();
    });
});