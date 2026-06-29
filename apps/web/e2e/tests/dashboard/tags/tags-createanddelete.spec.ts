import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { loginAs } from "@/e2e/helpers/auth";

test.describe("Tags - Crear y Eliminar (API)", () => {

    test("TAG-01: Debería crear un nuevo tag exitosamente", async ({ baseURL }) => {
        const tagName = `tag-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tags", {
            data: {
                tags: [{ name: tagName, label: tagName }]
            },
        });
        
        const createBody = await createResponse.json();

        expect(createResponse.status()).toBe(200);
        expect(createBody.response[0].name).toBe(tagName);
        expect(createBody.response[0].id).toBeDefined();

        await authenticatedUser.context.dispose();
    });

    test("TAG-05: Debería eliminar un tag existente correctamente", async ({ baseURL }) => {
        const tagName = `tag-del-${randomUUID().slice(0, 5)}`;
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: [{ name: tagName, label: tagName }] },
        });
        const createBody = await createResponse.json();
        const tagId = createBody.response[0].id;

        const deleteResponse = await authenticatedUser.context.delete(`/api/v1/tags/${tagId}`);
        
        expect(deleteResponse.status()).toBe(200);

        await authenticatedUser.context.dispose();
    });

    test("TAG-06: Comportamiento al eliminar un tag con links asociados", async ({ baseURL }) => {
        const tagName = `tag-link-${randomUUID().slice(0, 5)}`;
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const createTagRes = await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: [{ name: tagName, label: tagName }] },
        });
        const tagBody = await createTagRes.json();
        const tagId = tagBody.response[0].id;

        const createLinkRes = await authenticatedUser.context.post("/api/v1/links", {
            data: {
                url: "https://ejemplo-qa.com",
                name: "Link de prueba para tag",
                tags: [{ name: tagName, label: tagName }] 
            }
        });
        expect(createLinkRes.status()).toBe(200);

        const deleteResponse = await authenticatedUser.context.delete(`/api/v1/tags/${tagId}`);
        
        expect(deleteResponse.status()).toBe(200); 

        await authenticatedUser.context.dispose();
    });

    test("TAG-10: Debería manejar correctamente tags con espacios en blanco", async ({ baseURL }) => {
        const baseName = `tag-spc-${randomUUID().slice(0, 5)}`;
        const tagConEspacios = `   ${baseName}   `;
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tags", {
            data: {
                tags: [{ name: tagConEspacios, label: tagConEspacios }]
            },
        });
        
        const createBody = await createResponse.json();
        expect(createResponse.status()).toBe(200);
        
        expect(createBody.response[0].name).toBe(baseName);

        await authenticatedUser.context.dispose();
    });

    test("TAG-11: Validación al intentar crear un tag con nombre vacío", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tags", {
            data: {
                tags: [{ name: "", label: "" }]
            },
        });
        
        expect(createResponse.status()).toBe(400);

        await authenticatedUser.context.dispose();
    });

    test("TAG-12: Validación al crear un tag de 51 caracteres", async ({ baseURL }) => {
        const tagLargo = "a".repeat(51);
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const createResponse = await authenticatedUser.context.post("/api/v1/tags", {
            data: {
                tags: [{ name: tagLargo, label: tagLargo }]
            },
        });
        
        expect(createResponse.status()).toBe(400);

        await authenticatedUser.context.dispose();
    });
});