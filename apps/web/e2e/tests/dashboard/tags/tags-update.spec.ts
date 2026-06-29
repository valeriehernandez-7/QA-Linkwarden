import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { loginAs } from "@/e2e/helpers/auth";

test.describe("Tags - Actualizar (API)", () => {

    test("TAG-04: Debería actualizar el nombre de un tag existente correctamente", async ({ baseURL }) => {
        const tagOriginal = `tagOrig-${randomUUID().slice(0, 8)}`;
        const tagActualizado = `tagAct-${randomUUID().slice(0, 8)}`;
        
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");


        const createResponse = await authenticatedUser.context.post("/api/v1/tags", {
            data: {
                tags: [ 
                    { name: tagOriginal,
                    label: tagOriginal }
                ]
            },
        });
        const createBody = await createResponse.json();

        expect(createResponse.status()).toBe(200);


         const tagId = createBody.response[0].id;

        expect(createResponse.status()).toBe(200);

        const updateResponse = await authenticatedUser.context.put(`/api/v1/tags/${tagId}`, {
            data: {
                name: tagActualizado,
                label: tagActualizado
            },
        });
        const updateBody = await updateResponse.json();

        expect(updateResponse.status()).toBe(200);
        expect(updateBody.response.name).toBe(tagActualizado);

        await authenticatedUser.context.dispose();
    });
});