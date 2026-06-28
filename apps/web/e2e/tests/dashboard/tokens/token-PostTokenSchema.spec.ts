import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";
import { loginAs } from "@/e2e/helpers/auth";
import { stdout } from "process";


test.describe("Tokens POST Token Schema", () => {

    test("TOK-009: reject token name longer than 50 characters", async ({ request, baseURL }) => {
        const tokenName = 'a'.repeat(51);
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");
    
        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: 0,
            },
        });
    
        const body = await response.json();
    
        expect(response.status()).toBe(400);
        expect(body.response).toContain("Too big: expected string to have <=50 characters");
    
        await authenticatedUser.context.dispose();

        stdout.write(`Attempted to create token with invalid expires value: ${tokenName}\n`);
        stdout.write(`Response: ${JSON.stringify(body)}\n`);
    });
    
    test("TOK-010: reject invalid expires enum value", async ({ request, baseURL }) => {
        const tokenName = `tok010-${randomUUID().slice(0, 8)}`;
        const authenticatedUser = await loginAs(baseURL!, "username0", "username0");
    
        const response = await authenticatedUser.context.post("/api/v1/tokens", {
            data: {
                name: tokenName,
                expires: "invalid",
            },
        });
    
        const body = await response.json();
    
        expect(response.status()).toBe(400);
        expect(body.response).toContain("Invalid option: expected one of 0|1|2|3|4 ");
    
        await authenticatedUser.context.dispose();

        stdout.write(`Attempted to create token with invalid expires value: ${tokenName}\n`);
        stdout.write(`Response: ${JSON.stringify(body)}\n`);
    });
});