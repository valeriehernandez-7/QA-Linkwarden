import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockRemoveFolder, mockDeleteDocuments, mockMeiliIndex, prismaMock } =
  vi.hoisted(() => {
    const mockDeleteDocuments = vi.fn();
    const mockMeiliIndex = vi.fn(() => ({ deleteDocuments: mockDeleteDocuments }));
    const mockRemoveFolder = vi.fn();

    const prismaMock = {
      collection: {
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      usersAndCollections: {
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      link: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
      },
      dashboardSection: {
        findFirst: vi.fn(),
        delete: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    return { mockRemoveFolder, mockDeleteDocuments, mockMeiliIndex, prismaMock };
  });

vi.mock("@linkwarden/prisma", () => ({ prisma: prismaMock }));
vi.mock("@linkwarden/filesystem", () => ({ removeFolder: mockRemoveFolder }));
vi.mock("@linkwarden/lib/meilisearchClient", () => ({
  meiliClient: { index: mockMeiliIndex },
}));
vi.mock("@/lib/api/getPermission", () => ({ default: vi.fn() }));

import getPermission from "@/lib/api/getPermission";
import deleteCollectionById from "./deleteCollectionById";

const mockGetPermission = vi.mocked(getPermission);

const USER_ID = 1;
const OWNER_ID = 2;
const COLLECTION_ID = 10;
const SUB_COLLECTION_ID = 20;

function setupOwnerTransaction() {
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    prismaMock.collection.findMany.mockResolvedValueOnce([]);
    prismaMock.usersAndCollections.deleteMany.mockResolvedValue({} as any);
    prismaMock.link.findMany.mockResolvedValue([]);
    prismaMock.link.deleteMany.mockResolvedValue({} as any);
    prismaMock.collection.delete.mockResolvedValue({ id: COLLECTION_ID } as any);
    return fn(prismaMock);
  });
}

function setupOwnerTransactionWithSubcollection() {
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    prismaMock.collection.findMany
      .mockResolvedValueOnce([{ id: SUB_COLLECTION_ID, parentId: COLLECTION_ID }])
      .mockResolvedValueOnce([]);
    prismaMock.usersAndCollections.deleteMany.mockResolvedValue({} as any);
    prismaMock.link.findMany.mockResolvedValue([{ id: 99 }]);
    prismaMock.link.deleteMany.mockResolvedValue({} as any);
    prismaMock.collection.delete.mockResolvedValue({ id: COLLECTION_ID } as any);
    return fn(prismaMock);
  });
}

describe("deleteCollectionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ collectionOrder: [] } as any);
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.dashboardSection.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns status 401 when collectionId is zero", async () => {
    const result = await deleteCollectionById(USER_ID, 0);

    expect(result.status).toBe(401);
  });

  it("returns a descriptive message when collectionId is zero", async () => {
    const result = await deleteCollectionById(USER_ID, 0);

    expect(result.response).toContain("valid collection");
  });

  it("returns status 401 when the collection is not accessible by the user", async () => {
    mockGetPermission.mockResolvedValue(null);

    const result = await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(result.status).toBe(401);
  });

  it("returns a not accessible message when the collection is not accessible by the user", async () => {
    mockGetPermission.mockResolvedValue(null);

    const result = await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(result.response).toContain("not accessible");
  });

  it("returns status 401 when the user is not the owner and is not a member", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: OWNER_ID, members: [] } as any);

    const result = await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(result.status).toBe(401);
  });

  it("returns status 200 when a member leaves the collection", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: OWNER_ID,
      members: [{ userId: USER_ID }],
    } as any);
    prismaMock.usersAndCollections.delete.mockResolvedValue({} as any);
    prismaMock.link.updateMany.mockResolvedValue({} as any);

    const result = await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(result.status).toBe(200);
  });

  it("deletes the membership relation when the user leaves the collection", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: OWNER_ID,
      members: [{ userId: USER_ID }],
    } as any);
    prismaMock.usersAndCollections.delete.mockResolvedValue({} as any);
    prismaMock.link.updateMany.mockResolvedValue({} as any);

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.usersAndCollections.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_collectionId: { userId: USER_ID, collectionId: COLLECTION_ID } },
      })
    );
  });

  it("resets link index versions when the user leaves the collection", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: OWNER_ID,
      members: [{ userId: USER_ID }],
    } as any);
    prismaMock.usersAndCollections.delete.mockResolvedValue({} as any);
    prismaMock.link.updateMany.mockResolvedValue({} as any);

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.link.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collectionId: COLLECTION_ID },
        data: { indexVersion: null },
      })
    );
  });

  it("returns status 200 when the owner deletes a collection with no subcollections", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupOwnerTransaction();

    const result = await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(result.status).toBe(200);
  });

  it("deletes all member relations when the owner deletes the collection", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupOwnerTransaction();

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.usersAndCollections.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collection: { id: COLLECTION_ID } } })
    );
  });

  it("deletes all links in the collection when the owner deletes it", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupOwnerTransaction();

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.link.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collection: { id: COLLECTION_ID } } })
    );
  });

  it("deletes links from subcollections when the owner deletes a collection with children", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupOwnerTransactionWithSubcollection();

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.link.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collection: { id: SUB_COLLECTION_ID } } })
    );
  });

  it("deletes the subcollection record when the owner deletes a collection with children", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupOwnerTransactionWithSubcollection();

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.collection.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SUB_COLLECTION_ID } })
    );
  });

  it("removes archive folder of subcollection when the owner deletes a collection with children", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupOwnerTransactionWithSubcollection();

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(mockRemoveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: `archives/${SUB_COLLECTION_ID}` })
    );
  });

  it("removes the dashboard section when it exists for the user and collection", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: OWNER_ID,
      members: [{ userId: USER_ID }],
    } as any);
    prismaMock.usersAndCollections.delete.mockResolvedValue({} as any);
    prismaMock.link.updateMany.mockResolvedValue({} as any);
    prismaMock.dashboardSection.findFirst.mockResolvedValue({
      id: 5,
      order: 2,
      userId: USER_ID,
      collectionId: COLLECTION_ID,
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.dashboardSection.delete.mockResolvedValue({} as any);
    prismaMock.dashboardSection.updateMany.mockResolvedValue({} as any);

    await deleteCollectionById(USER_ID, COLLECTION_ID);

    expect(prismaMock.dashboardSection.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } })
    );
  });
});
