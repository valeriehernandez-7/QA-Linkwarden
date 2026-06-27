import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";
import { loginAs } from "@/e2e/helpers/auth";


test.describe("Tokens DELETE Token by ID", () => {

    test("TOK-007: revoke an active token", async ({ baseURL }) => {
        const tokenName = `tok007-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });

        const createBody = await createResponse.json();
        const tokenId = createBody.response.token.id;

        expect(createResponse.status()).toBe(200);
        expect(createBody.response.token.revoked).toBe(false);

        const revokeResponse = await authenticatedUser.context.delete(`/api/v1/tokens/${tokenId}`);
        const revokeBody = await revokeResponse.json();

        expect(revokeResponse.status()).toBe(200);
        expect(revokeBody.response.revoked).toBe(true);

        await authenticatedUser.context.dispose();
    });

    test("TOK-008: revoke an already revoked token idempotently", async ({ baseURL }) => {
        const tokenName = `tok008-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });

        const createBody = await createResponse.json();
        const tokenId = createBody.response.token.id;

        expect(createResponse.status()).toBe(200);

        const firstRevoke = await authenticatedUser.context.delete(`/api/v1/tokens/${tokenId}`);
        const firstRevokeBody = await firstRevoke.json();

        expect(firstRevoke.status()).toBe(200);
        expect(firstRevokeBody.response.revoked).toBe(true);

        const secondRevoke = await authenticatedUser.context.delete(`/api/v1/tokens/${tokenId}`);
        const secondRevokeBody = await secondRevoke.json();

        expect(secondRevoke.status()).toBe(200);
        expect(secondRevokeBody.response.revoked).toBe(true);

        await authenticatedUser.context.dispose();
    });
});