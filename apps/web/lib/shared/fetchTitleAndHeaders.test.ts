import { afterEach, describe, expect, it, vi } from "vitest";
import fetchTitleAndHeaders from "./fetchTitleAndHeaders";
import { safeFetch } from "@linkwarden/lib/safeFetch";

vi.mock("@linkwarden/lib/safeFetch", () => ({
    safeFetch: vi.fn(),
}));

function mockResponse(html: string, headers: Record<string, string> = {}) {
    return {
        status: 200,
        text: vi.fn().mockResolvedValue(html),
        headers: new Headers(headers),
    };
}

describe("fetchTitleAndHeaders", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("Empty when URL has no http and has no content", async () => {
        const res = await fetchTitleAndHeaders("ftp://example.com");

        expect(res.title).toBe("");
        expect(res.headers).toBeNull();
        expect(safeFetch).not.toHaveBeenCalled();
    });

    it("Returns title gotten from html", async () => {
        vi.mocked(safeFetch).mockResolvedValue(
            mockResponse("<html><head><title>Pepe</title></head></html>") as any
        );

        const res = await fetchTitleAndHeaders("https://www.canirun.ai/");

        expect(res.title).toBe("Pepe");
    });

    it("Empty when response has no status", async () => {
        vi.mocked(safeFetch).mockResolvedValue({} as any);

        const res = await fetchTitleAndHeaders("https://www.canirun.ai/");

        expect(res.title).toBe("");
        expect(res.headers).toBeNull();
    });
});