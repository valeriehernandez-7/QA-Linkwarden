import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    collection: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@linkwarden/prisma";
import getCollectionById from "./getCollectionById";

const mockFindFirst = vi.mocked(prisma.collection.findFirst);

const USER_ID = 1;
const COLLECTION_ID = 10;
const UNRELATED_USER_ID = 99;
const NONEXISTENT_COLLECTION_ID = 999;

const ownedCollection = {
  id: COLLECTION_ID,
  name: "My Collection",
  ownerId: USER_ID,
  members: [],
  _count: { links: 4 },
};

const sharedCollection = {
  id: 20,
  name: "Shared Collection",
  ownerId: 50,
  members: [
    {
      userId: USER_ID,
      user: { username: "owner", name: "Owner", image: null },
    },
  ],
  _count: { links: 1 },
};

describe("getCollectionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns status 200 when the owner requests an existing collection", async () => {
    mockFindFirst.mockResolvedValue(ownedCollection as any);

    const result = await getCollectionById(USER_ID, COLLECTION_ID);

    expect(result.status).toBe(200);
  });

  it("returns the collection data when the owner requests an existing collection", async () => {
    mockFindFirst.mockResolvedValue(ownedCollection as any);

    const result = await getCollectionById(USER_ID, COLLECTION_ID);

    expect(result.response).toEqual(ownedCollection);
  });

  it("returns status 200 when the collection does not exist for the given user", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCollectionById(USER_ID, NONEXISTENT_COLLECTION_ID);

    expect(result.status).toBe(200);
  });

  it("returns null when the collection does not exist for the given user", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCollectionById(USER_ID, NONEXISTENT_COLLECTION_ID);

    expect(result.response).toBeNull();
  });

  it("returns null when the user has no ownership or membership in the collection", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCollectionById(UNRELATED_USER_ID, COLLECTION_ID);

    expect(result.response).toBeNull();
  });

  it("filters by collectionId when querying the database", async () => {
    mockFindFirst.mockResolvedValue(null);

    await getCollectionById(USER_ID, COLLECTION_ID);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: COLLECTION_ID }),
      })
    );
  });

  it("filters by ownerId when building the access control query", async () => {
    mockFindFirst.mockResolvedValue(null);

    await getCollectionById(USER_ID, COLLECTION_ID);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ ownerId: USER_ID }]),
        }),
      })
    );
  });

  it("filters by member userId when building the access control query", async () => {
    mockFindFirst.mockResolvedValue(null);

    await getCollectionById(USER_ID, COLLECTION_ID);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { members: { some: { user: { id: USER_ID } } } },
          ]),
        }),
      })
    );
  });

  it("includes link count in the query when fetching a collection by id", async () => {
    mockFindFirst.mockResolvedValue(null);

    await getCollectionById(USER_ID, COLLECTION_ID);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: { select: { links: true } },
        }),
      })
    );
  });

  it("includes member user image in the query when fetching a collection by id", async () => {
    mockFindFirst.mockResolvedValue(null);

    await getCollectionById(USER_ID, COLLECTION_ID);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          members: expect.objectContaining({
            include: expect.objectContaining({
              user: expect.objectContaining({
                select: expect.objectContaining({ image: true }),
              }),
            }),
          }),
        }),
      })
    );
  });

  it("returns the shared collection when the user is a member", async () => {
    mockFindFirst.mockResolvedValue(sharedCollection as any);

    const result = await getCollectionById(USER_ID, sharedCollection.id);

    expect(result.response).toEqual(sharedCollection);
  });
});
