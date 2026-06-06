import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@linkwarden/prisma";
import postUser from "./postUser";

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    dashboardSection: {
      createMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../isAuthenticatedRequest", () => ({
  default: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: {
    hashSync: vi.fn().mockReturnValue("hashedPassword"),
  },
}));

describe("postUser - User Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Should create user with valid email", async () => {
    const mockRequest = {
      body: {
        email: "user@test.com",
        password: "SecurePass123!",
      },
    } as any;

    const mockResponse = {} as any;

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 1,
      email: "user@test.com",
      username: expect.any(String),
    } as any);

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(201);
    expect(result.response).toEqual(expect.objectContaining({ id: 1 }));
  });


  it("Should save user name when provided", async () => {
    const mockRequest = {
      body: {
        email: "user@test.com",
        name: "Test User",
        password: "SecurePass123!",
      },
    } as any;

    const mockResponse = {} as any;

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 1,
      email: "user@test.com",
      name: "Test User",
    } as any);

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(201);
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Test User" }),
      })
    );
  });

  it("Should save promotional email preference", async () => {
    const mockRequest = {
      body: {
        email: "user@test.com",
        password: "SecurePass123!",
        acceptPromotionalEmails: true,
      },
    } as any;

    const mockResponse = {} as any;

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 1,
      acceptPromotionalEmails: true,
    } as any);

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(201);
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ acceptPromotionalEmails: true }),
      })
    );
  });


  it("Should normalize email to lowercase", async () => {
    const mockRequest = {
      body: {
        email: "USER@TEST.COM",
        password: "SecurePass123!",
      },
    } as any;

    const mockResponse = {} as any;

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 1,
      email: "user@test.com",
    } as any);

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(201);
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalled();
  });


  it("Should create default dashboard sections", async () => {
    const mockRequest = {
      body: {
        email: "user@test.com",
        password: "SecurePass123!",
      },
    } as any;

    const mockResponse = {} as any;

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 1,
      dashboardSections: [
        { order: 0, type: "STATS" },
        { order: 1, type: "RECENT_LINKS" },
        { order: 2, type: "PINNED_LINKS" },
      ],
    } as any);

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(201);

    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dashboardSections: expect.any(Object),
        }),
      })
    );
  });

  it("Should reject invalid email", async () => {
    const mockRequest = {
      body: {
        email: "invalid-email",
        password: "SecurePass123!",
      },
    } as any;

    const mockResponse = {} as any;

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(400);
    expect(result.response).toContain("Error:");
  });

  it("Should reject password shorter than 8 characters", async () => {
    const mockRequest = {
      body: {
        email: "user@test.com",
        password: "short",
      },
    } as any;

    const mockResponse = {} as any;

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(400);
    expect(result.response).toContain("Error:");
  });

  it("Should reject password longer than 2048 characters", async () => {
    const mockRequest = {
      body: {
        email: "user@test.com",
        password: "a".repeat(2049),
      },
    } as any;

    const mockResponse = {} as any;

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(400);
  });

  it("Should reject duplicate email", async () => {
    const mockRequest = {
      body: {
        email: "existing@test.com",
        password: "SecurePass123!",
      },
    } as any;

    const mockResponse = {} as any;

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 2,
      email: "existing@test.com",
    } as any);

    const result = await postUser(mockRequest, mockResponse);

    expect(result.status).toBe(400);
    expect(result.response).toContain("Email or Username already exists");
  });
});
