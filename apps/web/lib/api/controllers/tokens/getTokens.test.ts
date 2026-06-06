import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import getTokens from "./getTokens";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        accessToken: {
            findMany: vi.fn(),
        },
    },
}));

describe("getTokens", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns active tokens for a user", async () => {
        const tokens = [
            { id: 1, name: "Token A", isSession: false, expires: new Date(), createdAt: new Date() },
        ];

        vi.mocked(prisma.accessToken.findMany).mockResolvedValue(tokens as any);

        const res = await getTokens(42);

        expect(res.status).toBe(200);
        expect(res.response).toEqual(tokens);
        expect(prisma.accessToken.findMany).toHaveBeenCalledOnce();
        expect(vi.mocked(prisma.accessToken.findMany).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                where: {
                    userId: 42,
                    revoked: false,
                },
            })
        );
    });

    it("returns an empty array when the user has no tokens", async () => {
        vi.mocked(prisma.accessToken.findMany).mockResolvedValue([] as any);

        const res = await getTokens(42);

        expect(res.status).toBe(200);
        expect(res.response).toEqual([]);
    });
});
