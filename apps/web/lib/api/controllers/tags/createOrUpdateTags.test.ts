import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import createOrUpdateTags from "./createOrUpdateTags";

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    tag: {
      upsert: vi.fn(),
    },
  },
}));

describe("Pruebas Unitarias - createOrUpdateTags", () => {
  const mockUserId = 1;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Debería procesar y retornar múltiples tags exitosamente", async () => {
    const mockTags = [
      { label: "javascript", archiveAsPDF: true },
      { label: "react", aiTag: true },
    ] as any;

    const mockUpsertedTag1 = { id: 1, name: "javascript", _count: { links: 0 } } as any;
    const mockUpsertedTag2 = { id: 2, name: "react", _count: { links: 5 } } as any;

    vi.mocked(prisma.tag.upsert)
      .mockResolvedValueOnce(mockUpsertedTag1)
      .mockResolvedValueOnce(mockUpsertedTag2);

    const result = await createOrUpdateTags(mockUserId, mockTags);

    expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result).toEqual([mockUpsertedTag1, mockUpsertedTag2]);
  });

  it("Debería mapear correctamente 'label' a 'name' y usar el 'ownerId' adecuado en la cláusula where", async () => {
    const mockTags = [
      {
        label: "tecnología",
        archiveAsScreenshot: true,
        archiveAsMonolith: false,
      },
    ] as any;

    vi.mocked(prisma.tag.upsert).mockResolvedValue({ id: 10, name: "tecnología" } as any);

    await createOrUpdateTags(mockUserId, mockTags);

    expect(prisma.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name_ownerId: {
            name: "tecnología",
            ownerId: mockUserId,
          },
        },
        create: expect.objectContaining({
          name: "tecnología",
          ownerId: mockUserId,
          archiveAsScreenshot: true,
        }),
        update: expect.objectContaining({
          archiveAsScreenshot: true,
          archiveAsMonolith: false,
        }),
        include: {
          _count: true,
        },
      })
    );
  });

  it("Debería retornar un arreglo vacío y no llamar a la base de datos si la lista de tags está vacía", async () => {
    const result = await createOrUpdateTags(mockUserId, [] as any);

    expect(prisma.tag.upsert).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("Debería enviar valores undefined si las banderas de archivado no vienen en el tag", async () => {
    const mockTags = [{ label: "minimalista" }] as any;

    vi.mocked(prisma.tag.upsert).mockResolvedValue({ id: 3, name: "minimalista" } as any);

    await createOrUpdateTags(mockUserId, mockTags);

    expect(prisma.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          archiveAsPDF: undefined,
          aiTag: undefined,
        }),
      })
    );
  });

  it("Debería lanzar un error si la base de datos falla al hacer el upsert", async () => {
    const mockTags = [{ label: "falla-segura" }] as any;

    vi.mocked(prisma.tag.upsert).mockRejectedValue(new Error("Unique constraint failed"));

    await expect(createOrUpdateTags(mockUserId, mockTags)).rejects.toThrow(
      "Unique constraint failed"
    );
    expect(prisma.tag.upsert).toHaveBeenCalledTimes(1);
  });
});