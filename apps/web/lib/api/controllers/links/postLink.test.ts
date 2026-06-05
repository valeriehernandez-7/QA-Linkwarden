import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@linkwarden/prisma";
import fetchTitleAndHeaders from "@/lib/shared/fetchTitleAndHeaders";
import setCollection from "../../setCollection";
import { hasPassedLimit } from "@linkwarden/lib/verifyCapacity";
import { isUrlSafeForServerSideFetch } from "@linkwarden/lib/ssrf";
import postLink from "./postLink";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
        link: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock("@/lib/shared/fetchTitleAndHeaders", () => ({
    default: vi.fn(),
}));

vi.mock("@linkwarden/filesystem", () => ({
    createFolder: vi.fn(),
}));

vi.mock("../../setCollection", () => ({
    default: vi.fn(),
}));

vi.mock("@linkwarden/lib/verifyCapacity", () => ({
    hasPassedLimit: vi.fn(),
}));

vi.mock("@linkwarden/lib/ssrf", () => ({
    isUrlSafeForServerSideFetch: vi.fn(),
}));

const mockUserId = 1;
const mockCollection = {
    id: 10,
    ownerId: mockUserId,
    name: "Collection",
};

const mockCreatedLink = {
    id: 100,
    collectionId: mockCollection.id,
    url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
    name: "QA Linkwarden README",
    description: "",
    type: "url",
    tags: [],
    collection: mockCollection,
}

function setupPath() {
    vi.mocked(isUrlSafeForServerSideFetch).mockResolvedValue(true);
    vi.mocked(setCollection).mockResolvedValue(mockCollection);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: mockUserId, preventDuplicateLinks: false } as any);
    vi.mocked(hasPassedLimit).mockResolvedValue(false);
    vi.mocked(fetchTitleAndHeaders).mockResolvedValue({ title: "Example", headers: new Headers({ "content-type": "text/html" }) });
    vi.mocked(prisma.link.create).mockResolvedValue(mockCreatedLink as any);
    vi.mocked(prisma.link.update).mockResolvedValue(mockCreatedLink as any);
}

describe("postLink", () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it("Create link with valid URL", async () => {
        setupPath();

        const res = await postLink({ url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md", tags: [] }, mockUserId);

        expect(res.status).toBe(200);
        expect(prisma.link.create).toHaveBeenCalledOnce();
    })

    it("Create link with invalid URL", async () => {
        const res = await postLink({ url: "ElPepe", tags: [] }, mockUserId);

        expect(res.status).toBe(400);
        expect(res.response).toContain("Error:");
        expect(prisma.link.create).not.toHaveBeenCalled();
    });

    it("Create link without URL", async () => {
        setupPath();
        vi.mocked(isUrlSafeForServerSideFetch).mockResolvedValue(false);
        vi.mocked(prisma.link.create).mockResolvedValue({ ...mockCreatedLink, url: null, type: "url" } as any);

        const res = await postLink({ tags: [] }, mockUserId);

        expect(res.status).toBe(200);
        const created = vi.mocked(prisma.link.create).mock.calls[0][0];
        expect(created.data.url).toBeNull();
    });

    it("Create link with personalized name", async () => {
        setupPath();
        vi.mocked(prisma.link.create).mockResolvedValue({ ...mockCreatedLink, name: "Nombre personalizado" } as any);

        const res = await postLink({ url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md", name: "Nombre personalizado", tags: [] }, mockUserId);

        expect(res.status).toBe(200);
        const created = vi.mocked(prisma.link.create).mock.calls[0][0];
        expect(created.data.name).toBe("Nombre personalizado");
    });

    it("Create link with image", async () => {
        setupPath();

        const result = await postLink({ url: "https://drive.google.com/file/d/1J2xjvTX-Xk5a4B4xFGpDJ45Cy6HInV9z/view?usp=sharing", image: "jpeg", tags: [] }, mockUserId);
        expect(result.status).toBe(200);
        expect(prisma.link.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { image: `archives/${mockCollection.id}/${mockCreatedLink.id}.jpeg` },
            })
        );
    });

    it("Automatically detect PDF type", async () => {
        setupPath();
        vi.mocked(fetchTitleAndHeaders).mockResolvedValue({
            title: "",
            headers: new Headers({ "content-type": "application/pdf" }),
        });

        await postLink({ url: "https://drive.google.com/file/d/1mmnCHvJf22X85RJAusmUQxcSbXWptGtK/view?usp=sharing", tags: [] }, mockUserId);
        const created = vi.mocked(prisma.link.create).mock.calls[0][0];
        expect(created.data.type).toBe("pdf");
    });

    it("Create link with tags", async () => {
        setupPath();

        await postLink({
            url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
            tags: [{ name: "dev" }, { name: "posgresql" }],
        }, mockUserId);

        const created = vi.mocked(prisma.link.create).mock.calls[0][0];
        expect(created.data.tags?.connectOrCreate).toHaveLength(2);
        expect(created.data.tags?.connectOrCreate[0].create.name).toBe("dev");
    });

    it("Create link with a description", async () => {
        setupPath();

        await postLink({
            url: "https://github.com/valeriehernandez-7/QA-Linkwarden/blob/main/README.md",
            description: "El elefante Dante camina hacia delante",
            tags: [],
        }, mockUserId);

        const created = vi.mocked(prisma.link.create).mock.calls[0][0];
        expect(created.data.description).toBe("El elefante Dante camina hacia delante");
    });
});