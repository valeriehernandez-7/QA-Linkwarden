import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { prisma } from "@linkwarden/prisma";
import mergeTags from "./mergeTags";

vi.mock("@prisma/client", () => ({
  Theme: ["light", "dark", "system"],
  DashboardSectionType: ["A", "B"],
}));

vi.mock("@linkwarden/prisma", () => ({
  Theme: ["light", "dark", "system"],
  DashboardSectionType: ["A", "B"],
  prisma: {
    link: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Pruebas Unitarias - mergeTags", () => {
  const mockUserId = 1;

  const mockTx = {
    tag: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    link: {
      updateMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback(mockTx);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Debería fusionar los tags exitosamente, reasignar los enlaces y retornar status 200", async () => {
    const mockBody = { tagIds: [1, 2], newTagName: "tecnología" };
    const mockLinks = [{ id: 100 }, { id: 101 }];
    const mockCreatedTag = { id: 3, name: "tecnología", ownerId: mockUserId };

    vi.mocked(prisma.link.findMany).mockResolvedValue(mockLinks as any);
    mockTx.tag.create.mockResolvedValue(mockCreatedTag);

    const result = await mergeTags(mockUserId, mockBody);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: expect.objectContaining({
            some: expect.objectContaining({ id: { in: [1, 2] } }),
          }),
        }),
      })
    );

    expect(mockTx.tag.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: mockUserId, id: { in: [1, 2] } },
    });

    expect(mockTx.tag.create).toHaveBeenCalledWith({
      data: {
        name: "tecnología",
        ownerId: mockUserId,
        links: { connect: [{ id: 100 }, { id: 101 }] },
      },
    });

    expect(mockTx.link.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [100, 101] } },
      data: { indexVersion: null },
    });

    expect(result).toEqual({ response: mockCreatedTag, status: 200 });
  });

  it("Debería retornar status 400 si la validación del body falla (ej. sin newTagName)", async () => {
    const invalidBody = { tagIds: [1, 2] } as any;

    const result = await mergeTags(mockUserId, invalidBody);

    expect(result.status).toBe(400);
    expect(result.response).toMatch(/Error:/);
    expect(prisma.link.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("Debería crear el nuevo tag sin conectar enlaces si los tags originales no tenían enlaces asociados", async () => {
    const mockBody = { tagIds: [5, 6], newTagName: "vacío" };
    const mockCreatedTag = { id: 7, name: "vacío" };

    vi.mocked(prisma.link.findMany).mockResolvedValue([]);
    mockTx.tag.create.mockResolvedValue(mockCreatedTag);

    const result = await mergeTags(mockUserId, mockBody);

    expect(mockTx.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          links: { connect: [] },
        }),
      })
    );

    expect(mockTx.link.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [] } },
      data: { indexVersion: null },
    });

    expect(result.status).toBe(200);
  });

  it("Debería asegurar que la búsqueda y eliminación consideren únicamente el ownerId del usuario actual", async () => {
    const mockBody = { tagIds: [10], newTagName: "seguro" };
    const strictUserId = 99;

    vi.mocked(prisma.link.findMany).mockResolvedValue([]);
    mockTx.tag.create.mockResolvedValue({ id: 11 });

    await mergeTags(strictUserId, mockBody);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: expect.objectContaining({
            some: expect.objectContaining({ ownerId: strictUserId }),
          }),
        }),
      })
    );

    expect(mockTx.tag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: strictUserId }),
      })
    );
  });

  it("Debería propagar el error si cualquier operación dentro de la transacción falla", async () => {
    const mockBody = { tagIds: [1], newTagName: "falla" };

    vi.mocked(prisma.link.findMany).mockResolvedValue([{ id: 10 }] as any);
    mockTx.tag.create.mockRejectedValue(new Error("Database lock timeout"));

    await expect(mergeTags(mockUserId, mockBody)).rejects.toThrow("Database lock timeout");

    expect(mockTx.link.updateMany).not.toHaveBeenCalled();
  });
});