import { test, expect } from "../../../index";
import { loginAs } from "@/e2e/helpers/auth";

test.describe("Tags - Suscripciones RSS (API)", () => {

    test("TAG-03: Error al crear suscripción RSS con nombre demasiado largo (Máx 50)", async ({ baseURL }) => {
        const authenticatedUser = await loginAs(baseURL || "http://localhost:3000", "username0", "username0");

        const nombreLargo = "b".repeat(51);

        const response = await authenticatedUser.context.post("/api/v1/rss", {
            data: {
                name: nombreLargo,
                url: "https://github.com/linkwarden/linkwarden/releases.atom",
                collectionId: 1
            }
        });

        const textResponse = await response.text();
        console.log(`=== [TAG-03] STATUS RECIBIDO: ${response.status()} ===`);
        
        let body;
        try {
            body = JSON.parse(textResponse);
            console.log("=== [TAG-03] RESPUESTA DEL SERVIDOR (JSON) ===", body);
        } catch {
            console.log("=== [TAG-03] RESPUESTA DEL SERVIDOR (HTML) ===", textResponse.slice(0, 200));
        }

        expect(response.status()).toBe(400);

        await authenticatedUser.context.dispose();
    });
});