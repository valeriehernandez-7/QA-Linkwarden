import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { loginAs } from "@/e2e/helpers/auth";

test.describe("Tags - Merge (API)", () => {

    test("TAG-07: Debería fusionar dos tags exitosamente", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const tag1 = `tag1-${randomUUID().slice(0, 5)}`;
        const tag2 = `tag2-${randomUUID().slice(0, 5)}`;
        
        const createRes1 = await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: [{ name: tag1, label: tag1 }] },
        });
        const id1 = (await createRes1.json()).response[0].id;

        const createRes2 = await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: [{ name: tag2, label: tag2 }] },
        });
        const id2 = (await createRes2.json()).response[0].id;

        const targetName = `merged-${randomUUID().slice(0, 5)}`;
        
        const mergeResponse = await authenticatedUser.context.put("/api/v1/tags/merge", {
            data: {
                tagIds: [id1, id2],
                newTagName: targetName
            }
        });
        
        const mergeBody = await mergeResponse.json();

        expect(mergeResponse.status()).toBe(200);
        expect(mergeBody.response.name).toBe(targetName);

        await authenticatedUser.context.dispose();
    });

    test("TAG-08: Debería fusionar 5 tags exitosamente", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");
        const ids = [];

        for (let i = 0; i < 5; i++) {
            const tagName = `tagBulk${i}-${randomUUID().slice(0, 4)}`;
            const res = await authenticatedUser.context.post("/api/v1/tags", {
                data: { tags: [{ name: tagName, label: tagName }] },
            });
            const body = await res.json();
            ids.push(body.response[0].id);
        }

        const targetName = `super-merged-${randomUUID().slice(0, 5)}`;
        
        const mergeResponse = await authenticatedUser.context.put("/api/v1/tags/merge", {
            data: {
                tagIds: ids,
                newTagName: targetName
            }
        });

        const mergeBody = await mergeResponse.json();

        expect(mergeResponse.status()).toBe(200);
        expect(mergeBody.response.name).toBe(targetName);

        await authenticatedUser.context.dispose();
    });

    test("TAG-09: Al fusionar tags se debería poder conservar el nombre de uno de ellos", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const tagPrincipal = `tagMaster-${randomUUID().slice(0, 5)}`;
        const tagSecundario = `tagSlave-${randomUUID().slice(0, 5)}`;
        
        const resPrincipal = await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: [{ name: tagPrincipal, label: tagPrincipal }] },
        });
        const idPrincipal = (await resPrincipal.json()).response[0].id;

        const resSecundario = await authenticatedUser.context.post("/api/v1/tags", {
            data: { tags: [{ name: tagSecundario, label: tagSecundario }] },
        });
        const idSecundario = (await resSecundario.json()).response[0].id;

        const mergeResponse = await authenticatedUser.context.put("/api/v1/tags/merge", {
            data: {
                tagIds: [idPrincipal, idSecundario],
                newTagName: tagPrincipal 
            }
        });

        const mergeBody = await mergeResponse.json();
        
        expect(mergeResponse.status()).toBe(200);
        expect(mergeBody.response.name).toBe(tagPrincipal);
        
        await authenticatedUser.context.dispose();
    });

});