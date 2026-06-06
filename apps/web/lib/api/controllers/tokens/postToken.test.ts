import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@linkwarden/prisma";
import { TokenExpiry } from "@linkwarden/types/global";
import postToken from "./postToken";

vi.mock("@linkwarden/prisma", () => ({
  prisma: {
    accessToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("next-auth/jwt", () => ({
  encode: vi.fn().mockResolvedValue("encoded_jwt_token"),
  decode: vi.fn().mockResolvedValue({ jti: "uuid-123" }),
}));

vi.mock("@linkwarden/lib/schemaValidation", () => ({
  PostTokenSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  PostTokenSchemaType: {},
}));

vi.mock("crypto", () => ({
  default: {
    randomUUID: vi.fn().mockReturnValue("uuid-123"),
  },
}));

describe("postToken - Token Creation", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Should create token with 7 days expiry", async () => {
    const body = { name: "API Key", expires: TokenExpiry.sevenDays };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.accessToken.create).mockResolvedValue({
      id: 1,
      name: "API Key",
      expires: expect.any(Date),
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({
        secretKey: expect.any(String),
        token: expect.any(Object),
      })
    );
  });


  it("Should create token with never expiry (~200 years)", async () => {
    const body = { name: "Long Term", expires: TokenExpiry.never };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.accessToken.create).mockResolvedValue({
      id: 1,
      name: "Long Term",
      expires: expect.any(Date),
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(200);
    expect(vi.mocked(prisma.accessToken.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Long Term",
        }),
      })
    );
  });


  it("Should create token with 1 month expiry", async () => {
    const body = { name: "Monthly", expires: TokenExpiry.oneMonth };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.accessToken.create).mockResolvedValue({
      id: 1,
      name: "Monthly",
      expires: expect.any(Date),
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(200);
  });

  it("Should create token with 2 months expiry", async () => {
    const body = { name: "BiMonthly", expires: TokenExpiry.twoMonths };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.accessToken.create).mockResolvedValue({
      id: 1,
      name: "BiMonthly",
      expires: expect.any(Date),
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(200);
  });

  it("Should create token with 3 months expiry", async () => {
    const body = { name: "Quarterly", expires: TokenExpiry.threeMonths };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.accessToken.create).mockResolvedValue({
      id: 1,
      name: "Quarterly",
      expires: expect.any(Date),
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(200);
  });

  it("Should generate and return secret key JWT", async () => {
    const body = { name: "Test Token", expires: TokenExpiry.sevenDays };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.accessToken.create).mockResolvedValue({
      id: 1,
      token: "uuid-123",
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(200);
    expect((result.response as any).secretKey).toBe("encoded_jwt_token");
    expect((result.response as any).token).toEqual(
      expect.objectContaining({ token: "uuid-123" })
    );
  });

  it("Should reject duplicate active token name", async () => {
    const body = { name: "API Key", expires: TokenExpiry.sevenDays };
    const userId = 1;

    vi.mocked(prisma.accessToken.findFirst).mockResolvedValue({
      id: 1,
      name: "API Key",
      revoked: false,
    } as any);

    const result = await postToken(body, userId);

    expect(result.status).toBe(400);
    expect(result.response).toBe("Token with that name already exists.");
  });


  it("Should reject empty token name", async () => {
    const body = { name: "", expires: TokenExpiry.sevenDays };
    const userId = 1;

    const result = await postToken(body, userId);

    expect(result.status).toBe(400);
    expect(result.response).toBe("Token with that name already exists.");
  });
});

