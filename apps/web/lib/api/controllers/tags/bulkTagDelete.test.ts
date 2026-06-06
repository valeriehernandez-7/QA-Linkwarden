import { describe, it, expect, vi, afterEach } from "vitest";

import { prisma } from "@linkwarden/prisma";
import bulkTagDelete from "./bulkTagDelete";

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
      updateMany: vi.fn(),
    },
    tag: {
      deleteMany: vi.fn(),
    },
  },
}));

describe("Pruebas Unitarias - bulkTagDelete", () => {
  const mockUserId = 1;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Debería eliminar los tags exitosamente y retornar status 200", async () => {
    const mockBody = { tagIds: [10, 11, 12] };
    const mockLinks = [{ id: 100 }, { id: 101 }];

    vi.mocked(prisma.link.findMany).mockResolvedValue(mockLinks as any);
    vi.mocked(prisma.tag.deleteMany).mockResolvedValue({ count: 3 });
    vi.mocked(prisma.link.updateMany).mockResolvedValue({ count: 2 } as any);

    const result = await bulkTagDelete(mockUserId, mockBody);

    expect(prisma.link.findMany).toHaveBeenCalled();
    expect(prisma.tag.deleteMany).toHaveBeenCalledWith({
      where: {
        ownerId: mockUserId,
        id: { in: mockBody.tagIds },
      },
    });
    expect(prisma.link.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [100, 101] } },
      data: { indexVersion: null },
    });
    expect(result).toEqual({ response: 3, status: 200 });
  });

  it("Debería retornar status 400 si la validación del cuerpo falla (ej. tagIds vacío o inválido)", async () => {
    const invalidBody = { tagIds: "no-es-un-array" } as any;

    const result = await bulkTagDelete(mockUserId, invalidBody);

    expect(result.status).toBe(400);
    expect(result.response).toMatch(/Error:/);
    expect(prisma.tag.deleteMany).not.toHaveBeenCalled();
    expect(prisma.link.updateMany).not.toHaveBeenCalled();
  });

  it("Debería retornar status 200 incluso si no hay enlaces asociados a los tags", async () => {
    const mockBody = { tagIds: [5] };

    vi.mocked(prisma.link.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tag.deleteMany).mockResolvedValue({ count: 1 });

    const result = await bulkTagDelete(mockUserId, mockBody);

    expect(prisma.tag.deleteMany).toHaveBeenCalled();
    expect(prisma.link.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [] } },
      data: { indexVersion: null },
    });
    expect(result).toEqual({ response: 1, status: 200 });
  });

  it("Debería asegurar que la eliminación solo afecte los tags del usuario que hace la petición (ownerId)", async () => {
    const mockBody = { tagIds: [20] };
    const customUserId = 999;

    vi.mocked(prisma.link.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tag.deleteMany).mockResolvedValue({ count: 1 });

    await bulkTagDelete(customUserId, mockBody);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: expect.objectContaining({
            some: expect.objectContaining({
              ownerId: customUserId,
            }),
          }),
        }),
      })
    );

    expect(prisma.tag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: customUserId,
        }),
      })
    );
  });

  it("Debería propagar el error si ocurre una falla en la base de datos", async () => {
    const mockBody = { tagIds: [1] };

    vi.mocked(prisma.link.findMany).mockRejectedValue(
      new Error("Error de conexión a la base de datos")
    );

    await expect(bulkTagDelete(mockUserId, mockBody)).rejects.toThrow(
      "Error de conexión a la base de datos"
    );
  });
});