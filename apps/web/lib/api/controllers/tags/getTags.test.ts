import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { prisma } from "@linkwarden/prisma";
import { TagSort } from "@linkwarden/types/global";
import getTags from "./getTags";

vi.mock("@linkwarden/prisma", () => ({
  Theme: {
    light: "light",
    dark: "dark",
    system: "system",
  },
  prisma: {
    usersAndCollections: {
      findMany: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
  },
}));

describe("Pruebas Unitarias - getTags", () => {
  beforeEach(() => {
    delete process.env.PAGINATION_TAKE_COUNT;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Debería retornar un error 400 si no se provee ni userId ni collectionId", async () => {
    const result = await getTags({});

    expect(result.statusCode).toBe(400);
    expect(result.success).toBe(false);
    expect(result.message).toBe("Please choose a valid user or collection.");
    expect(prisma.tag.findMany).not.toHaveBeenCalled();
  });

  it("Debería retornar tags asociados al usuario buscando por ownerId y por colecciones donde es miembro", async () => {
    const mockUserId = 1;

    vi.mocked(prisma.usersAndCollections.findMany).mockResolvedValue([{ collectionId: 10 }] as any);
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: 1, name: "javascript" }] as any);

    const result = await getTags({ userId: mockUserId });

    expect(prisma.usersAndCollections.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      select: { collectionId: true },
    });
    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { ownerId: mockUserId },
                {
                  links: {
                    some: {
                      collectionId: { in: [10] },
                    },
                  },
                },
              ],
            },
          ],
        },
      })
    );
    expect(result.statusCode).toBe(200);
    expect(result.data?.tags).toHaveLength(1);
  });

  it("Debería decodificar la búsqueda y configurar la paginación correctamente si se provee un cursor", async () => {
    const mockUserId = 2;
    process.env.PAGINATION_TAKE_COUNT = "10";

    vi.mocked(prisma.usersAndCollections.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: 50, name: "dev ops" }] as any);

    const result = await getTags({
      userId: mockUserId,
      query: { search: "dev%20ops", cursor: 49 },
    });

    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 1,
        cursor: { id: 49 },
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              name: expect.objectContaining({ contains: "dev ops" }),
            }),
          ]),
        }),
      })
    );
    expect(result.data?.nextCursor).toBeNull();
  });

  it("Debería aplicar correctamente el criterio de ordenamiento cuando se envía query.sort", async () => {
    const mockUserId = 3;

    vi.mocked(prisma.usersAndCollections.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);

    await getTags({
      userId: mockUserId,
      query: { sort: TagSort.NameZA },
    });

    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ name: "desc" }, { id: "desc" }],
      })
    );
  });

  it("Debería buscar tags basándose únicamente en el collectionId si no se envía userId", async () => {
    const mockCollectionId = 99;

    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: 3, name: "recursos" }] as any);

    const result = await getTags({ collectionId: mockCollectionId });

    expect(prisma.usersAndCollections.findMany).not.toHaveBeenCalled();
    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              links: {
                some: { collectionId: mockCollectionId },
              },
            },
          ],
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      })
    );
    expect(result.statusCode).toBe(200);
    expect(result.data?.tags).toHaveLength(1);
  });
});