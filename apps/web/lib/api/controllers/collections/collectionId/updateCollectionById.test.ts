import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    collection: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    usersAndCollections: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    link: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prismaMock };
});

vi.mock("@linkwarden/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/api/getPermission", () => ({ default: vi.fn() }));

import getPermission from "@/lib/api/getPermission";
import updateCollectionById from "./updateCollectionById";

const mockGetPermission = vi.mocked(getPermission);

const USER_ID = 1;
const COLLECTION_ID = 10;
const PARENT_COLLECTION_ID = 5;

const validBody = {
  id: COLLECTION_ID,
  name: "Updated Collection",
  description: "Updated description",
  color: "#000000",
  isPublic: false,
  members: [],
};

const updatedCollection = {
  id: COLLECTION_ID,
  name: "Updated Collection",
  members: [],
  links: [],
  _count: { links: 0 },
};

function setupSuccessfulTransaction() {
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    prismaMock.usersAndCollections.deleteMany.mockResolvedValue({} as any);
    prismaMock.collection.update.mockResolvedValue(updatedCollection as any);
    return fn(prismaMock);
  });
  prismaMock.link.updateMany.mockResolvedValue({} as any);
}

describe("updateCollectionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns status 401 when collectionId is zero", async () => {
    const result = await updateCollectionById(USER_ID, 0, validBody as any);

    expect(result.status).toBe(401);
  });

  it("returns a descriptive message when collectionId is zero", async () => {
    const result = await updateCollectionById(USER_ID, 0, validBody as any);

    expect(result.response).toContain("valid collection");
  });

  it("returns status 400 when the collection name exceeds 2048 characters", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);

    const result = await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      name: "a".repeat(2049),
    } as any);

    expect(result.status).toBe(400);
  });

  it("returns an error string when the collection name exceeds 2048 characters", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);

    const result = await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      name: "a".repeat(2049),
    } as any);

    expect(typeof result.response).toBe("string");
  });

  it("returns status 401 when the user is not the collection owner", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: 99, members: [] } as any);

    const result = await updateCollectionById(
      USER_ID,
      COLLECTION_ID,
      validBody as any
    );

    expect(result.status).toBe(401);
  });

  it("returns a not accessible message when the user is not the collection owner", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: 99, members: [] } as any);

    const result = await updateCollectionById(
      USER_ID,
      COLLECTION_ID,
      validBody as any
    );

    expect(result.response).toContain("not accessible");
  });

  it("returns status 200 when the owner updates the collection with valid data", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupSuccessfulTransaction();

    const result = await updateCollectionById(
      USER_ID,
      COLLECTION_ID,
      validBody as any
    );

    expect(result.status).toBe(200);
  });

  it("returns the updated collection in the response when the update succeeds", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupSuccessfulTransaction();

    const result = await updateCollectionById(
      USER_ID,
      COLLECTION_ID,
      validBody as any
    );

    expect((result.response as any).name).toBe("Updated Collection");
  });

  it("deletes existing member relations before updating the collection", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupSuccessfulTransaction();

    await updateCollectionById(USER_ID, COLLECTION_ID, validBody as any);

    expect(prismaMock.usersAndCollections.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collection: { id: COLLECTION_ID } },
      })
    );
  });

  it("resets link index versions after updating the collection", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupSuccessfulTransaction();

    await updateCollectionById(USER_ID, COLLECTION_ID, validBody as any);

    expect(prismaMock.link.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { indexVersion: null },
      })
    );
  });

  it("returns status 403 when the parent collection belongs to another user", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    prismaMock.collection.findUnique.mockResolvedValue({
      ownerId: 99,
      parentId: null,
    } as any);

    const result = await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      parentId: PARENT_COLLECTION_ID,
    } as any);

    expect(result.status).toBe(403);
  });

  it("returns an unauthorized message when the parent collection belongs to another user", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    prismaMock.collection.findUnique.mockResolvedValue({
      ownerId: 99,
      parentId: null,
    } as any);

    const result = await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      parentId: PARENT_COLLECTION_ID,
    } as any);

    expect(result.response).toContain("not authorized");
  });

  it("filters duplicate members before updating the collection", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupSuccessfulTransaction();

    await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      members: [
        { userId: 2, canCreate: true, canUpdate: true, canDelete: false },
        { userId: 2, canCreate: true, canUpdate: true, canDelete: false },
      ],
    } as any);

    const updateCall = prismaMock.collection.update.mock.calls[0][0];
    expect(updateCall.data.members.create).toHaveLength(1);
  });

  it("propagates members to subcollections when propagateToSubcollections is true", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      prismaMock.collection.findMany.mockResolvedValueOnce([
        { id: 20, ownerId: USER_ID },
      ]);
      prismaMock.collection.findMany.mockResolvedValueOnce([]);
      prismaMock.usersAndCollections.deleteMany.mockResolvedValue({} as any);
      prismaMock.usersAndCollections.createMany.mockResolvedValue({} as any);
      prismaMock.collection.update.mockResolvedValue(updatedCollection as any);
      return fn(prismaMock);
    });
    prismaMock.link.updateMany.mockResolvedValue({} as any);

    await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      propagateToSubcollections: true,
      members: [{ userId: 3, canCreate: true, canUpdate: true, canDelete: true }],
    } as any);

    expect(prismaMock.usersAndCollections.createMany).toHaveBeenCalled();
  });

  it("disconnects the parent when parentId is set to root", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: USER_ID, members: [] } as any);
    setupSuccessfulTransaction();

    await updateCollectionById(USER_ID, COLLECTION_ID, {
      ...validBody,
      parentId: "root",
    } as any);

    const updateCall = prismaMock.collection.update.mock.calls[0][0];
    expect(updateCall.data.parent).toEqual({ disconnect: true });
  });
});
