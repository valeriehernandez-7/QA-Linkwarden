import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";
import { moveFiles, removeFiles } from "@linkwarden/filesystem";
import updateLinkById from "./updateLinkById";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        link: {
            update: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}));

vi.mock("@/lib/api/getPermission", () => ({
    default: vi.fn(),
}));

vi.mock("@linkwarden/filesystem", () => ({
    moveFiles: vi.fn(),
    removeFiles: vi.fn(),
}));

vi.mock("@/lib/shared/isValidUrl", () => ({
    default: vi.fn(() => true),
}));

const mockUserId = 1;
const mockLinkId = 50;

const mockCollection = {
    id: 10,
    ownerId: mockUserId,
};

const mockOldLink = {
    id: mockLinkId,
    url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
    collectionId: mockCollection.id,
};

const mockUpdatedLink = {
    ...mockOldLink,
    name: "Updated",
    tags: [],
    collection: mockCollection,
};

const validBody = {
    id: mockLinkId,
    url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
    name: "Updated",
    description: "",
    collection: { id: mockCollection.id, ownerId: mockUserId },
    tags: [],
};

function setupPath() {
    vi.mocked(getPermission).mockResolvedValue({
        id: mockCollection.id,
        ownerId: mockUserId,
        members: [],
    } as any);
    vi.mocked(prisma.link.findUnique).mockResolvedValue(mockOldLink as any);
    vi.mocked(prisma.link.update).mockResolvedValue(mockUpdatedLink as any);
}

describe("updateLinkById", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("Body is invalid", async () => {
        const res = await updateLinkById(mockUserId, mockLinkId, {} as any);

        expect(res.status).toBe(400);
        expect(res.response).toContain("Error:");
        expect(prisma.link.update).not.toHaveBeenCalled();
    });

    it("Member can pin a link to their dashboard", async () => {
        vi.mocked(getPermission).mockResolvedValue({
            id: mockCollection.id,
            ownerId: 123,
            members: [{ userId: mockUserId, canUpdate: true }],
        } as any);
        vi.mocked(prisma.link.update).mockResolvedValue(mockUpdatedLink as any);

        const res = await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            pinnedBy: [{ id: mockUserId }],
        });

        expect(res.status).toBe(200);
        expect(prisma.link.update).toHaveBeenCalledOnce();
    });

    it("401 code when target collection doesnt match data", async () => {
        vi.mocked(getPermission)
            .mockResolvedValueOnce({
                id: mockCollection.id,
                ownerId: mockUserId,
                members: [],
            } as any)
            .mockResolvedValueOnce({
                id: 123,
                ownerId: 123,
            } as any);

        const res = await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            collection: { id: 444, ownerId: mockUserId },
        });

        expect(res.status).toBe(401);
        expect(res.response).toBe("Target collection does not match the data.");
    });

    it("401 code when user in not the owner and has no can udpate permision", async () => {
        vi.mocked(getPermission).mockResolvedValue({
            id: mockCollection.id,
            ownerId: 123,
            members: [{ userId: mockUserId, canUpdate: false }],
        } as any);
        vi.mocked(prisma.link.findUnique).mockResolvedValue(mockOldLink as any);

        const res = await updateLinkById(mockUserId, mockLinkId, validBody);

        expect(res.status).toBe(401);
        expect(res.response).toBe("Collection is not accessible.");
    });

    it("Owner updates link", async () => {
        setupPath();

        const res = await updateLinkById(mockUserId, mockLinkId, validBody);

        expect(res.status).toBe(200);
        expect(prisma.link.update).toHaveBeenCalledOnce();
    });

    it("Updates link name and description", async () => {
        setupPath();

        await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            name: "hola",
            description: "hola hola",
        });

        const call = vi.mocked(prisma.link.update).mock.calls[0][0];
        expect(call.data.name).toBe("hola");
        expect(call.data.description).toBe("hola hola");
    });

    it("Updates link with tags", async () => {
        setupPath();

        await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            tags: [{ name: "dev" }, { name: "qa" }],
        });

        const call = vi.mocked(prisma.link.update).mock.calls[0][0];
        expect(call.data.tags?.connectOrCreate).toHaveLength(2);
    });

    it("Remove duplicated tags", async () => {
        setupPath();

        await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            tags: [{ name: "dev" }, { name: "dev" }, { name: "qa" }],
        });

        const call = vi.mocked(prisma.link.update).mock.calls[0][0];
        expect(call.data.tags?.connectOrCreate).toHaveLength(2);
    });

    it("Replaces tags when removePreviousTags is true", async () => {
        setupPath();

        await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            tags: [{ name: "hola" }],
        }, true);

        const call = vi.mocked(prisma.link.update).mock.calls[0][0];
        expect(call.data.tags).toHaveProperty("set");
    });

    it("Removes old files when URL changes", async () => {
        setupPath();
        vi.mocked(prisma.link.findUnique).mockResolvedValue({
            ...mockOldLink,
            url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
        } as any);

        await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            url: "https://www.canirun.ai/",
        });

        expect(removeFiles).toHaveBeenCalledOnce();
    });

    it("401 code when new URL invalid", async () => {
        setupPath();
        vi.mocked(prisma.link.findUnique).mockResolvedValue({
            ...mockOldLink,
            url: "https://www.canirun.ai/",
        } as any);

        const { default: isValidUrl } = await import("@/lib/shared/isValidUrl");
        vi.mocked(isValidUrl).mockReturnValue(false);

        const res = await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            url: "me cago",
        });

        expect(res.status).toBe(401);
        expect(res.response).toBe("Invalid URL.");
    });

    it("Moves files when link is moved to another collection", async () => {
        const targetCollectionId = 20;

        vi.mocked(getPermission)
            .mockResolvedValueOnce({
                id: mockCollection.id,
                ownerId: mockUserId,
                members: [],
            } as any)
            .mockResolvedValueOnce({
                id: targetCollectionId,
                ownerId: mockUserId,
                members: [],
            } as any);

        vi.mocked(prisma.link.findUnique).mockResolvedValue(mockOldLink as any);
        vi.mocked(prisma.link.update).mockResolvedValue(mockUpdatedLink as any);

        await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            collection: { id: targetCollectionId, ownerId: mockUserId },
        });

        expect(moveFiles).toHaveBeenCalledWith(
            mockLinkId,
            mockCollection.id,
            targetCollectionId
        );
    });

    it("401 code when tries to move link to another collection", async () => {
        const targetCollectionId = 20;

        vi.mocked(getPermission)
            .mockResolvedValueOnce({
                id: mockCollection.id,
                ownerId: 123,
                members: [{ userId: mockUserId, canUpdate: true }],
            } as any)
            .mockResolvedValueOnce({
                id: targetCollectionId,
                ownerId: mockUserId,
            } as any);

        vi.mocked(prisma.link.findUnique).mockResolvedValue(mockOldLink as any);

        const res = await updateLinkById(mockUserId, mockLinkId, {
            ...validBody,
            collection: { id: targetCollectionId, ownerId: mockUserId },
        });

        expect(res.status).toBe(401);
        expect(res.response).toBe("You can't move a link to/from a collection you don't own.");
    });
});