import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import deleteToken from "./deleteTokenById";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        accessToken: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
    },
}));

describe("deleteToken - Token Revocation", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("Should revoke active token", async () => {
        const userId = 1;
        const tokenId = 123;

        vi.mocked(prisma.accessToken.findFirst).mockResolvedValue({
            id: tokenId,
            name: "API Key",
            revoked: false,
        } as any);

        vi.mocked(prisma.accessToken.update).mockResolvedValue({
            id: tokenId,
            revoked: true,
        } as any);

        const result = await deleteToken(userId, tokenId);

        expect(result.status).toBe(200);
        expect(result.response).toEqual(expect.objectContaining({ revoked: true }));
    });

    it("Should revoke already revoked token", async () => {
        const userId = 1;
        const tokenId = 123;

        vi.mocked(prisma.accessToken.findFirst).mockResolvedValue({
            id: tokenId,
            name: "API Key",
            revoked: true,
        } as any);

        vi.mocked(prisma.accessToken.update).mockResolvedValue({
            id: tokenId,
            revoked: true,
        } as any);

        const result = await deleteToken(userId, tokenId);

        expect(result.status).toBe(200);
        expect(result.response).toEqual(expect.objectContaining({ revoked: true }));
    });


    it("Should reject non-existent token ID", async () => {
        const userId = 1;
        const tokenId = 0;

        const result = await deleteToken(userId, tokenId);

        expect(result.status).toBe(401);
        expect(result.response).toBe("Please choose a valid token.");
        expect(prisma.accessToken.findFirst).not.toHaveBeenCalled();
    });


    it("Should reject token from different user", async () => {
        const userId = 1;
        const tokenId = 99999;

        vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);

        const result = await deleteToken(userId, tokenId);

        expect(result.status).toBe(200);
        expect(vi.mocked(prisma.accessToken.findFirst)).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: tokenId,
                    userId,
                }),
            })
        );
    });
});
