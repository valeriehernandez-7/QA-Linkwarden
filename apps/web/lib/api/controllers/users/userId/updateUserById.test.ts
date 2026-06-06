import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import updateUserById from "./updateUserById";


vi.mock("@linkwarden/lib/schemaValidation", () => ({
  UpdateUserSchema: () => ({
    safeParse: (data: any) => ({ success: true, data }),
  }),
}));

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashedPassword"),
    compare: vi.fn().mockResolvedValue(true),
    hashSync: vi.fn().mockReturnValue("hashedPassword"),
    compareSync: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("@linkwarden/filesystem", () => ({
  removeFile: vi.fn(),
  createFile: vi.fn(),
  createFolder: vi.fn(),
}));

vi.mock("@/lib/api/sendChangeEmailVerificationRequest", () => ({
  default: vi.fn(),
}));

/** Minimal prisma.user.update response shape required by updateUserById */
const makeUpdatedUser = (overrides = {}) => ({
  id: 1,
  name: null,
  username: "user",
  email: null,
  image: "",
  password: null,
  subscriptions: null,
  dashboardSections: [],
  parentSubscription: null,
  ...overrides,
});

describe("updateUserById - User Update", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });


  it("Should update user name", async () => {
    const userId = 1;
    const body = { name: "Nuevo Nombre", username: "existinguser" };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: null,
      password: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(
      makeUpdatedUser({ name: "Nuevo Nombre" }) as any
    );

    const result = await updateUserById(userId, body as any);

    expect(result.status).toBe(200);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Nuevo Nombre" }),
      })
    );
  });

  it("Should update unique username", async () => {
    const userId = 1;
    const body = { username: "nuevouser" };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: null,
      password: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(
      makeUpdatedUser({ username: "nuevouser" }) as any
    );

    const result = await updateUserById(userId, body as any);

    expect(result.status).toBe(200);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: expect.any(String) }),
      })
    );
  });

  it("Should update archive preferences", async () => {
    const userId = 1;
    const body = {
      username: "existinguser",
      archiveAsScreenshot: true,
      archiveAsPDF: false,
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: null,
      password: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(
      makeUpdatedUser({ archiveAsScreenshot: true, archiveAsPDF: false }) as any
    );

    const result = await updateUserById(userId, body as any);

    expect(result.status).toBe(200);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          archiveAsScreenshot: true,
          archiveAsPDF: false,
        }),
      })
    );
  });

  it("Should disable duplicate link prevention", async () => {
    const userId = 1;
    const body = { username: "existinguser", preventDuplicateLinks: false };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: null,
      password: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue(
      makeUpdatedUser({ preventDuplicateLinks: false }) as any
    );

    const result = await updateUserById(userId, body as any);

    expect(result.status).toBe(200);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ preventDuplicateLinks: false }),
      })
    );
  });

  it("Should reject duplicate username", async () => {
    const userId = 1;
    const body = { username: "taken" };

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 2,
      username: "taken",
      email: "other@test.com", 
    } as any);

    const result = await updateUserById(userId, body as any);

    expect(result.status).toBe(400);
    expect(result.response).toBe("Username is taken.");
  });


  it("Should reject duplicate email", async () => {
    const userId = 1;
    const body = { email: "taken@test.com", username: "someuser" };

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 2,
      email: "taken@test.com",
      username: "differentuser",
    } as any);

    const result = await updateUserById(userId, body as any);

    expect(result.status).toBe(400);
    expect(result.response).toBe("Email is taken.");
  });
});