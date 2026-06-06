import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";
import deleteLink from "./deleteLinkById";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        link: {
            delete: vi.fn(),
        },
    },
}));

vi.mock("@/lib/api/getPermission", () => ({
    default: vi.fn(),
}));

vi.mock("@linkwarden/filesystem", () => ({
    removeFiles: vi.fn(),
}));

vi.mock("@linkwarden/lib/meilisearchClient", () => ({
    meiliClient: {
        index: vi.fn(() => ({
            deleteDocument: vi.fn(),
        })),
    },
}));

const mockUserId = 1;
const mockLinkId = 50;

const mockCollection = {
    id: 10,
    ownerId: mockUserId,
    members: [],
};

const mockDeletedLink = {
    id: mockLinkId,
    url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
    collectionId: mockCollection.id,
};

describe("deleteLink", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("401 code when link id is not provided", async () => {
        const res = await deleteLink(mockUserId, 0);

        expect(res.status).toBe(401);
        expect(res.response).toBe("Please choose a valid link.");
        expect(prisma.link.delete).not.toHaveBeenCalled();
    });

    it("401 code when collection is not accessible", async () => {
        vi.mocked(getPermission).mockResolvedValue(null as any);

        const res = await deleteLink(mockUserId, mockLinkId);

        expect(res.status).toBe(401);
        expect(res.response).toBe("Collection is not accessible.");
        expect(prisma.link.delete).not.toHaveBeenCalled();
    });

    it("Owner deletes link ok", async () => {
        vi.mocked(getPermission).mockResolvedValue(mockCollection as any);
        vi.mocked(prisma.link.delete).mockResolvedValue(mockDeletedLink as any);

        const res = await deleteLink(mockUserId, mockLinkId);

        expect(res.status).toBe(200);
        expect(res.response).toEqual(mockDeletedLink);
        expect(prisma.link.delete).toHaveBeenCalledWith({
            where: { id: mockLinkId },
        });
    });

    it("Member with can delete permission deletes link successfully", async () => {
        vi.mocked(getPermission).mockResolvedValue({
            ...mockCollection,
            ownerId: 123,
            members: [{ userId: mockUserId, canDelete: true }],
        } as any);
        vi.mocked(prisma.link.delete).mockResolvedValue(mockDeletedLink as any);

        const res = await deleteLink(mockUserId, mockLinkId);

        expect(res.status).toBe(200);
        expect(prisma.link.delete).toHaveBeenCalledOnce();
    });
});