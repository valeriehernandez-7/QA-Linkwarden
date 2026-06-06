import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    collection: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@linkwarden/prisma";
import getCollections from "./getCollections";

const mockFindMany = vi.mocked(prisma.collection.findMany);

const OWNER_USER_ID = 1;
const MEMBER_USER_ID = 2;
const UNRELATED_USER_ID = 99;

const ownedCollection = {
  id: 10,
  name: "My Collection",
  ownerId: OWNER_USER_ID,
  members: [],
  _count: { links: 5 },
  parent: null,
};

const sharedCollection = {
  id: 20,
  name: "Shared Collection",
  ownerId: 50,
  members: [
    {
      userId: MEMBER_USER_ID,
      user: { username: "owner", name: "Owner", image: null },
    },
  ],
  _count: { links: 2 },
  parent: null,
};

describe("getCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns status 200 when the owner requests their collections", async () => {
    mockFindMany.mockResolvedValue([ownedCollection]);

    const result = await getCollections(OWNER_USER_ID);

    expect(result.status).toBe(200);
  });

  it("returns the owned collection in the response body when the user is the owner", async () => {
    mockFindMany.mockResolvedValue([ownedCollection]);

    const result = await getCollections(OWNER_USER_ID);

    expect(result.response).toEqual([ownedCollection]);
  });

  it("returns status 200 when the user has no collections", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getCollections(UNRELATED_USER_ID);

    expect(result.status).toBe(200);
  });

  it("returns an empty array when the user has no collections", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getCollections(UNRELATED_USER_ID);

    expect(result.response).toEqual([]);
  });

  it("queries by ownerId when building the filter for the given userId", async () => {
    mockFindMany.mockResolvedValue([]);

    await getCollections(OWNER_USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ ownerId: OWNER_USER_ID }]),
        }),
      })
    );
  });

  it("queries by member userId when building the filter for the given userId", async () => {
    mockFindMany.mockResolvedValue([]);

    await getCollections(MEMBER_USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { members: { some: { user: { id: MEMBER_USER_ID } } } },
          ]),
        }),
      })
    );
  });

  it("includes link count in the query when fetching collections", async () => {
    mockFindMany.mockResolvedValue([]);

    await getCollections(OWNER_USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: { select: { links: true } },
        }),
      })
    );
  });

  it("includes parent collection data in the query when fetching collections", async () => {
    mockFindMany.mockResolvedValue([]);

    await getCollections(OWNER_USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          parent: { select: { id: true, name: true } },
        }),
      })
    );
  });

  it("includes member user data in the query when fetching collections", async () => {
    mockFindMany.mockResolvedValue([]);

    await getCollections(OWNER_USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          members: expect.objectContaining({
            include: expect.objectContaining({
              user: expect.objectContaining({
                select: expect.objectContaining({
                  username: true,
                  name: true,
                  image: true,
                }),
              }),
            }),
          }),
        }),
      })
    );
  });

  it("returns the shared collection when the user is a member", async () => {
    mockFindMany.mockResolvedValue([sharedCollection]);

    const result = await getCollections(MEMBER_USER_ID);

    expect(result.response).toEqual([sharedCollection]);
  });

  it("returns multiple collections when the user owns and is a member of different ones", async () => {
    mockFindMany.mockResolvedValue([ownedCollection, sharedCollection]);

    const result = await getCollections(OWNER_USER_ID);

    expect((result.response as (typeof ownedCollection)[]).length).toBe(2);
  });
});
