import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import getPermission from "./getPermission";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        collection: {
            findFirst: vi.fn(),
        },
    },
}));

const mockUserId = 1;
const mockLinkId = 50;
const mockCollectionId = 10;

const mockCollection = {
    id: mockCollectionId,
    ownerId: mockUserId,
    members: [],
};

describe("getPermission", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("Returns collection when link id exists", async () => {
        vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockCollection as any);

        const res = await getPermission({ userId: mockUserId, linkId: mockLinkId });

        expect(res).toEqual(mockCollection);
        expect(prisma.collection.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    links: { some: { id: mockLinkId } },
                },
                include: { members: true },
            })
        );
    });

    it("Returns collection when user is the owner", async () => {
        vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockCollection as any);

        const res = await getPermission({ userId: mockUserId, collectionId: mockCollectionId });

        expect(res).toEqual(mockCollection);
        expect(prisma.collection.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: mockCollectionId,
                    OR: [{ ownerId: mockUserId }, { members: { some: { userId: mockUserId } } }],
                },
                include: { members: true },
            })
        );
    });

    it("Returns undefined when link id or collection id is not provided", async () => {
        const res = await getPermission({ userId: mockUserId });

        expect(res).toBeUndefined();
        expect(prisma.collection.findFirst).not.toHaveBeenCalled();
    });
});