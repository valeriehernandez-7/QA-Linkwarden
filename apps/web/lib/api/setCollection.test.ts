import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import getPermission from "./getPermission";
import setCollection from "./setCollection";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        collection: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        user: {
            update: vi.fn(),
        },
    },
}));

vi.mock("./getPermission", () => ({
    default: vi.fn(),
}));

const mockUserId = 1;

const mockCollection = {
    id: 10,
    name: "My Collection",
    ownerId: mockUserId,
    parentId: null,
};

const mockUnorganized = {
    id: 99,
    name: "Unorganized",
    ownerId: mockUserId,
    parentId: null,
};

describe("SetCollection tests", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("Collection ID does not exist", async () => {
        vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);
        const res = await setCollection({ userId: mockUserId, collectionId: 111 });
        expect(res).toBeNull();
        expect(prisma.collection.findUnique).toHaveBeenCalledOnce();
    })

    it("User is the owner so returns collection", async () => {
        vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCollection as any);
        vi.mocked(getPermission).mockResolvedValue({ ownerId: mockUserId, members: [] } as any);

        const res = await setCollection({ userId: mockUserId, collectionId: 10 });

        expect(res).toEqual(mockCollection);
    });

    it("User is a canCreate member so returns collection", async () => {
        vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCollection as any);
        vi.mocked(getPermission).mockResolvedValue({ ownerId: 999, members: [{ userId: mockUserId, canCreate: true }] } as any);

        const res = await setCollection({ userId: mockUserId, collectionId: 10 });

        expect(res).toEqual(mockCollection);
    });

    it("User cant create son returns null", async () => {
        vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCollection as any);
        vi.mocked(getPermission).mockResolvedValue({ ownerId: 123, members: [{ userId: mockUserId, canCreate: false }] } as any);

        const res = await setCollection({ userId: mockUserId, collectionId: 10 });

        expect(res).toBeNull();
    });

    it("Collection name is default son returns Unorganized collection", async () => {
        vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockUnorganized as any);
        vi.mocked(prisma.collection.create).mockResolvedValue(mockUnorganized as any);

        const res = await setCollection({ userId: mockUserId, collectionName: "Unorganized" });

        expect(res).toEqual(mockUnorganized);
    });

    it("Is first top level Unorganized collection is created and returned", async () => {
        vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.collection.create).mockResolvedValue(mockUnorganized as any);

        const res = await setCollection({ userId: mockUserId, collectionName: "Unorganized" });

        expect(res).toEqual(mockUnorganized);
    });

    it("Creates new collection with a name", async () => {
        const newCollection = { id: 11, name: "Hola", ownerId: mockUserId, parentId: null };
        vi.mocked(prisma.collection.create).mockResolvedValue(newCollection as any);

        const res = await setCollection({ userId: mockUserId, collectionName: "Hola" });

        expect(prisma.collection.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ name: "Hola", ownerId: mockUserId }),
            })
        );
        expect(prisma.user.update).toHaveBeenCalledOnce();
        expect(res).toEqual(newCollection);
    });

    it("Unorganized collection with no params", async () => {
        vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockUnorganized as any);

        const res = await setCollection({ userId: mockUserId });

        expect(res).toEqual(mockUnorganized);
        expect(prisma.collection.create).not.toHaveBeenCalled();
    });

    it("Creates unorganized collection with no params and there is any", async () => {
        vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.collection.create).mockResolvedValue(mockUnorganized as any);

        const res = await setCollection({ userId: mockUserId });

        expect(prisma.collection.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    name: "Unorganized",
                    ownerId: mockUserId,
                    parentId: null,
                }),
            })
        );
        expect(res).toEqual(mockUnorganized);
    });
})