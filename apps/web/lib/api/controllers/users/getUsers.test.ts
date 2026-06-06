import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import getUsers from "./getUsers";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        user: {
            findMany: vi.fn(),
        },
        subscription: {
            findFirst: vi.fn(),
        },
    },
}));

describe("getUsers", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns all users when requester is admin", async () => {
        const users = [
            { id: 2, username: "beta", email: "beta@example.com", emailVerified: null, subscriptions: [{ active: false }], createdAt: new Date(2026, 0, 1) },
            { id: 1, username: "alpha", email: "alpha@example.com", emailVerified: null, subscriptions: [{ active: true }], createdAt: new Date(2026, 0, 2) },
        ];

        vi.mocked(prisma.user.findMany).mockResolvedValue(users as any);

        const res = await getUsers({ id: 1 } as any);

        expect(res.status).toBe(200);
        expect(res.response).toEqual([
            expect.objectContaining({ id: 1, username: "alpha" }),
            expect.objectContaining({ id: 2, username: "beta" }),
        ]);
        expect(prisma.user.findMany).toHaveBeenCalledOnce();
    });

    it("returns 404 when non-admin user has no subscription", async () => {
        vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

        const res = await getUsers({ id: 2 } as any);

        expect(res.status).toBe(404);
        expect(res.response).toBe("Subscription not found.");
        expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("returns subscription members for non-admin user", async () => {
        const subscription = { id: 123 };
        const users = [
            { id: 5, name: "Member", username: "member", email: "member@example.com", emailVerified: null, createdAt: new Date(2026, 0, 3) },
        ];

        vi.mocked(prisma.subscription.findFirst).mockResolvedValue(subscription as any);
        vi.mocked(prisma.user.findMany).mockResolvedValue(users as any);

        const res = await getUsers({ id: 2 } as any);

        expect(res.status).toBe(200);
        expect(res.response).toEqual(users);
        expect(prisma.user.findMany).toHaveBeenCalledOnce();
        expect(vi.mocked(prisma.user.findMany).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.any(Array),
                }),
            })
        );
    });
});
