import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockParseString = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ items: [] })
);

vi.mock("@linkwarden/prisma", () => ({
  Theme: {
    light: "light",
    dark: "dark",
    system: "system",
  },
  prisma: {
    rssSubscription: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@linkwarden/lib/schemaValidation", () => ({
  PostRssSubscriptionSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock("@/lib/api/verifyUser", () => ({ default: vi.fn() }));
vi.mock("@/lib/api/setCollection", () => ({ default: vi.fn() }));
vi.mock("@linkwarden/lib/ssrf", () => ({ assertUrlIsSafeForServerSideFetch: vi.fn() }));
vi.mock("@linkwarden/lib/safeFetch", () => ({ safeFetch: vi.fn() }));
vi.mock("@linkwarden/lib/rssHandler", () => ({ rssHandler: vi.fn() }));

vi.mock("rss-parser", () => ({
  default: class {
    parseString = mockParseString;
  },
}));

import handler from "./index";
import { createMocks } from "node-mocks-http";
import { prisma } from "@linkwarden/prisma";
import verifyUser from "@/lib/api/verifyUser";
import setCollection from "@/lib/api/setCollection";
import { assertUrlIsSafeForServerSideFetch } from "@linkwarden/lib/ssrf";
import { safeFetch } from "@linkwarden/lib/safeFetch";
import { rssHandler } from "@linkwarden/lib/rssHandler";
import { PostRssSubscriptionSchema } from "@linkwarden/lib/schemaValidation";

const mockVerifyUser      = vi.mocked(verifyUser);
const mockFindMany        = vi.mocked(prisma.rssSubscription.findMany);
const mockCount           = vi.mocked(prisma.rssSubscription.count);
const mockFindFirst       = vi.mocked(prisma.rssSubscription.findFirst);
const mockCreate          = vi.mocked(prisma.rssSubscription.create);
const mockAssertUrlIsSafe = vi.mocked(assertUrlIsSafeForServerSideFetch);
const mockSetCollection   = vi.mocked(setCollection);
const mockSafeFetch       = vi.mocked(safeFetch);
const mockRssHandler      = vi.mocked(rssHandler);
const mockSafeParse       = vi.mocked(PostRssSubscriptionSchema.safeParse as any);

describe("Pruebas Unitarias - RSS Handler (index.ts)", () => {
  const mockUser = { id: 1, name: "Test User" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockUser as any);
    mockSafeParse.mockImplementation((body: any) => ({
      success: true,
      data: body,
    }));
    mockParseString.mockResolvedValue({ items: [] });
    process.env.NEXT_PUBLIC_DEMO = "false";
    process.env.RSS_SUBSCRIPTION_LIMIT_PER_USER = "20";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("RSS-001: Debería retornar status 200 y la lista de suscripciones RSS en peticiones GET", async () => {
    const { req, res } = createMocks({ method: "GET" });
    const mockSubscriptions = [{ id: 10, name: "Tech News" }];

    mockFindMany.mockResolvedValue(mockSubscriptions as any);

    await handler(req as any, res as any);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: mockUser.id } })
    );
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ response: mockSubscriptions });
  });

  it("RSS-002: Debería crear una suscripción, procesar el XML y retornar 200", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { name: "Blog", url: "https://ejemplo.com/rss", collectionId: 5 },
    });

    mockCount.mockResolvedValue(5 as any);
    mockAssertUrlIsSafe.mockResolvedValue(true as any);
    mockSetCollection.mockResolvedValue({ id: 5 } as any);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 1, url: "https://ejemplo.com/rss" } as any);
    mockSafeFetch.mockResolvedValue({ text: async () => "<xml></xml>" } as any);

    await handler(req as any, res as any);

    expect(mockCreate).toHaveBeenCalled();
    expect(mockSafeFetch).toHaveBeenCalledWith("https://ejemplo.com/rss");
    expect(mockRssHandler).toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);
  });

  it("RSS-003: Debería rechazar la creación y retornar 400 si la URL del RSS no es segura (SSRF)", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { name: "Localhost Hack", url: "http://127.0.0.1/admin", collectionId: 1 },
    });

    mockCount.mockResolvedValue(1 as any);
    mockAssertUrlIsSafe.mockRejectedValue(new Error("Local network URLs are not allowed"));

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).response).toBe("Local network URLs are not allowed");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("RSS-004: Debería retornar 403 si el usuario alcanzó el límite máximo de suscripciones", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { name: "Nuevo RSS", url: "https://ejemplo.com/feed", collectionId: 1 },
    });

    mockCount.mockResolvedValue(20 as any);

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(403);
    expect(JSON.parse(res._getData()).response).toContain("reached the limit");
    expect(mockSetCollection).not.toHaveBeenCalled();
  });

  it("RSS-005: Debería retornar 403 si el usuario no tiene permisos sobre la colección especificada", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { name: "Private Feed", url: "https://ejemplo.com", collectionId: 99 },
    });

    mockCount.mockResolvedValue(5 as any);
    mockAssertUrlIsSafe.mockResolvedValue(true as any);
    mockSetCollection.mockResolvedValue(null);

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(403);
    expect(JSON.parse(res._getData()).response).toBe(
      "You do not have permission to add a link to this collection"
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});