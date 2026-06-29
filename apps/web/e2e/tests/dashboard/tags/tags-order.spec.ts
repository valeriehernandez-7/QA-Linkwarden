import { test, expect } from "../../../index";
import { loginAs } from "@/e2e/helpers/auth";
import { randomUUID } from "crypto";

test.describe("Tags - Ordenamiento (API)", () => {
    test.beforeEach(async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");
        
        const dummyTags = [
            { name: `A-tag-${randomUUID().slice(0, 4)}`, label: "A" },
            { name: `B-tag-${randomUUID().slice(0, 4)}`, label: "B" },
            { name: `C-tag-${randomUUID().slice(0, 4)}`, label: "C" }
        ];

        await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: dummyTags }
        });

        await authenticatedUser.context.dispose();
    });
    test("TAG-15: Ordenar la lista de etiquetas ascendentemente por su nombre", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const response = await authenticatedUser.context.get("/api/v1/tags?sort=name&order=asc");
        const body = await response.json();
        const tags = body.data?.tags || [];

        expect(response.status()).toBe(200);
        expect(tags.length).toBeGreaterThan(0);

        let isSorted = true;
        for (let i = 0; i < tags.length - 1; i++) {
            if (tags[i].name.toLowerCase().localeCompare(tags[i + 1].name.toLowerCase()) > 0) {
                isSorted = false;
                console.error(`[TAG-15] Error de orden alfabético asc: "${tags[i].name}" fue listado antes que "${tags[i + 1].name}"`);
                break;
            }
        }
        expect(isSorted).toBe(true);

        await authenticatedUser.context.dispose();
    });

    test("TAG-16: Ordenar la lista de etiquetas descendentemente por su nombre", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const response = await authenticatedUser.context.get("/api/v1/tags?sort=name&order=desc");
        const body = await response.json();
        const tags = body.data?.tags || [];

        expect(response.status()).toBe(200);
        expect(tags.length).toBeGreaterThan(0);

        let isSorted = true;
        for (let i = 0; i < tags.length - 1; i++) {
            if (tags[i].name.toLowerCase().localeCompare(tags[i + 1].name.toLowerCase()) < 0) {
                isSorted = false;
                console.error(`[TAG-16] Error de orden alfabético desc: "${tags[i].name}" fue listado antes que "${tags[i + 1].name}"`);
                break;
            }
        }
        expect(isSorted).toBe(true);

        await authenticatedUser.context.dispose();
    });

    test("TAG-17: Ordenar la lista de etiquetas ascendentemente por su Cantidad de links", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const response = await authenticatedUser.context.get("/api/v1/tags?sort=links&order=asc");
        const body = await response.json();
        const tags = body.data?.tags || [];

        expect(response.status()).toBe(200);
        expect(tags.length).toBeGreaterThan(0);

        let isSorted = true;
        for (let i = 0; i < tags.length - 1; i++) {
            const currentCount = tags[i]._count?.links || 0;
            const nextCount = tags[i + 1]._count?.links || 0;

            if (currentCount > nextCount) {
                isSorted = false;
                console.error(`[TAG-17] Error de conteo asc: ID ${tags[i].id} (${currentCount} links) listado antes que ID ${tags[i+1].id} (${nextCount} links)`);
                break;
            }
        }
        expect(isSorted).toBe(true);

        await authenticatedUser.context.dispose();
    });

    test("TAG-18: Ordenar la lista de etiquetas descendentemente por su Cantidad de links", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const response = await authenticatedUser.context.get("/api/v1/tags?sort=links&order=desc");
        const body = await response.json();
        const tags = body.data?.tags || [];

        expect(response.status()).toBe(200);
        expect(tags.length).toBeGreaterThan(0);

        let isSorted = true;
        for (let i = 0; i < tags.length - 1; i++) {
            const currentCount = tags[i]._count?.links || 0;
            const nextCount = tags[i + 1]._count?.links || 0;

            if (currentCount < nextCount) {
                isSorted = false;
                console.error(`[TAG-18] Error de conteo desc: ID ${tags[i].id} (${currentCount} links) listado antes que ID ${tags[i+1].id} (${nextCount} links)`);
                break;
            }
        }
        expect(isSorted).toBe(true);

        await authenticatedUser.context.dispose();
    });

    test("TAG-19: Ordenar la lista de etiquetas ascendentemente por su fecha de creacion", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const response = await authenticatedUser.context.get("/api/v1/tags?sort=createdAt&order=asc");
        const body = await response.json();
        const tags = body.data?.tags || [];

        expect(response.status()).toBe(200);
        expect(tags.length).toBeGreaterThan(0);

        let isSorted = true;
        for (let i = 0; i < tags.length - 1; i++) {
            const currentDate = new Date(tags[i].createdAt).getTime();
            const nextDate = new Date(tags[i + 1].createdAt).getTime();

            if (currentDate > nextDate) {
                isSorted = false;
                console.error(`[TAG-19] Error de fecha asc: ${tags[i].createdAt} listada antes que ${tags[i+1].createdAt}`);
                break;
            }
        }
        expect(isSorted).toBe(true);

        await authenticatedUser.context.dispose();
    });

    test("TAG-20: Ordenar la lista de etiquetas descendentemente por su fecha de creacion", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const response = await authenticatedUser.context.get("/api/v1/tags?sort=createdAt&order=desc");
        const body = await response.json();
        const tags = body.data?.tags || [];

        expect(response.status()).toBe(200);
        expect(tags.length).toBeGreaterThan(0);

        let isSorted = true;
        for (let i = 0; i < tags.length - 1; i++) {
            const currentDate = new Date(tags[i].createdAt).getTime();
            const nextDate = new Date(tags[i + 1].createdAt).getTime();

            if (currentDate < nextDate) {
                isSorted = false;
                console.error(`[TAG-20] Error de fecha desc: ${tags[i].createdAt} listada antes que ${tags[i+1].createdAt}`);
                break;
            }
        }
        expect(isSorted).toBe(true);

        await authenticatedUser.context.dispose();
    });
});