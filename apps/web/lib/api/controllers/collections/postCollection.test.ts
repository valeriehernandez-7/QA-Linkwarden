import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    collection: {
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@linkwarden/filesystem", () => ({
  createFolder: vi.fn(),
}));

vi.mock("@/lib/api/getPermission", () => ({
  default: vi.fn(),
}));

vi.mock("../../getCollectionRootOwnerAndMembers", () => ({
  default: vi.fn(),
}));

import { prisma } from "@linkwarden/prisma";
import { createFolder } from "@linkwarden/filesystem";
import getPermission from "@/lib/api/getPermission";
import getCollectionRootOwnerAndMembers from "../../getCollectionRootOwnerAndMembers";
import postCollection from "./postCollection";

const mockCreate = vi.mocked(prisma.collection.create);
const mockUserUpdate = vi.mocked(prisma.user.update);
const mockCreateFolder = vi.mocked(createFolder);
const mockGetPermission = vi.mocked(getPermission);
const mockGetRootOwner = vi.mocked(getCollectionRootOwnerAndMembers);

const USER_ID = 1;
const PARENT_COLLECTION_ID = 5;
const ROOT_OWNER_ID = 2;

const validBody = {
  name: "New Collection",
  description: "A test collection",
  color: "#ffffff",
  members: [],
};

const validBodyWithParent = {
  ...validBody,
  parentId: PARENT_COLLECTION_ID,
};

const createdCollection = {
  id: 10,
  name: "New Collection",
  members: [],
  _count: { links: 0 },
};

describe("postCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns status 400 when collection name exceeds 2048 characters", async () => {
    const result = await postCollection(
      { ...validBody, name: "a".repeat(2049) },
      USER_ID
    );

    expect(result.status).toBe(400);
  });

  it("returns an error message string when collection name exceeds 2048 characters", async () => {
    const result = await postCollection(
      { ...validBody, name: "a".repeat(2049) },
      USER_ID
    );

    expect(typeof result.response).toBe("string");
  });

  it("returns status 200 when a valid collection body is provided", async () => {
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    const result = await postCollection(validBody, USER_ID);

    expect(result.status).toBe(200);
  });

  it("returns the created collection in the response when input is valid", async () => {
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    const result = await postCollection(validBody, USER_ID);

    expect(result.response).toEqual(createdCollection);
  });

  it("creates archive folder after successfully creating a collection", async () => {
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    await postCollection(validBody, USER_ID);

    expect(mockCreateFolder).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: `archives/${createdCollection.id}` })
    );
  });

  it("creates preview archive folder after successfully creating a collection", async () => {
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    await postCollection(validBody, USER_ID);

    expect(mockCreateFolder).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: `archives/preview/${createdCollection.id}` })
    );
  });

  it("updates the user collection order after creating a collection", async () => {
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    await postCollection(validBody, USER_ID);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID } })
    );
  });

  it("returns status 403 when user has no access to the parent collection", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: ROOT_OWNER_ID, members: [] } as any);

    const result = await postCollection(validBodyWithParent, USER_ID);

    expect(result.status).toBe(403);
  });

  it("returns an unauthorized message when user has no access to the parent collection", async () => {
    mockGetPermission.mockResolvedValue({ ownerId: ROOT_OWNER_ID, members: [] } as any);

    const result = await postCollection(validBodyWithParent, USER_ID);

    expect(result.response).toContain("not authorized");
  });

  it("returns status 404 when the parent collection root owner cannot be resolved", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: ROOT_OWNER_ID,
      members: [
        { userId: USER_ID, canCreate: true, canUpdate: true, canDelete: true },
      ],
    } as any);
    mockGetRootOwner.mockResolvedValue({ rootOwnerId: null, members: [] } as any);

    const result = await postCollection(validBodyWithParent, USER_ID);

    expect(result.status).toBe(404);
  });

  it("returns status 200 when user has full member access to the parent collection", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: ROOT_OWNER_ID,
      members: [
        { userId: USER_ID, canCreate: true, canUpdate: true, canDelete: true },
      ],
    } as any);
    mockGetRootOwner.mockResolvedValue({
      rootOwnerId: ROOT_OWNER_ID,
      members: [
        { userId: USER_ID, canCreate: true, canUpdate: true, canDelete: true },
      ],
    } as any);
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    const result = await postCollection(validBodyWithParent, USER_ID);

    expect(result.status).toBe(200);
  });

  it("returns status 200 when the user is the owner of the parent collection", async () => {
    mockGetPermission.mockResolvedValue({
      ownerId: USER_ID,
      members: [],
    } as any);
    mockGetRootOwner.mockResolvedValue({
      rootOwnerId: USER_ID,
      members: [],
    } as any);
    mockCreate.mockResolvedValue(createdCollection as any);
    mockUserUpdate.mockResolvedValue({} as any);

    const result = await postCollection(validBodyWithParent, USER_ID);

    expect(result.status).toBe(200);
  });
});
