import { randomUUID } from "crypto";
import { existsSync, statSync } from "fs";
import path from "path";
import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";
import { text } from "stream/consumers";
import { stdout } from "process";


test.describe("Users - Create Users", () => {

    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
    })

    test("USR-005: create new user with a username", async ({page, }) => {
        await page.goto("/register");

        const testUsername = `usr005-${randomUUID().slice(0, 8)}`;
        const testPassword = "SecurePass123!";
        

        await page.getByTestId("display-name-input").fill(testUsername);
        await page.getByTestId("username-input").fill(testUsername);
        await page.getByTestId("password-input").fill(testPassword);
        await page.getByTestId("password-confirm-input").fill(testPassword);
        
        await page.getByTestId("register-button").click();

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "success");

        stdout.write(`Created user: ${testUsername}\n`);
    });

    test("USR-006: trim and handle username with surrounding spaces", async ({ request }) => {
        const spacedUsername = `  usr006-${randomUUID().slice(0, 8)}  `;
        const trimmed = spacedUsername.trim();
        const password = "SecurePass123!";

        const response = await request.post("/api/v1/users", {
            data: {
                username: spacedUsername,
                password,
            },
        });

        if (response.status() === 201) {
            const user = (await response.json()).response;
            expect(user).toHaveProperty("username", trimmed);
            expect(user).toHaveProperty("createdAt");
        } else {
            // Accept either normalization (trim) or a validation rejection (400)
            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body).toBeDefined();
        }

        stdout.write(`Attempted to create user with spaces: ${spacedUsername}\n`);
        stdout.write(`Response status: ${response.status()}\n`);
    });

    test("USR-013: reject weak password during registration", async ({ page }) => {
        await page.goto("/register");

        const testUsername = `usr013-${randomUUID().slice(0, 8)}`;
        const weakPassword = "12345";

        await page.getByTestId("display-name-input").fill("Test User");
        await page.getByTestId("username-input").fill(testUsername);
        await page.getByTestId("password-input").fill(weakPassword);
        await page.getByTestId("password-confirm-input").fill(weakPassword);
        await page.getByTestId("register-button").click();

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "error");

        stdout.write(`Attempted registration with weak password: ${weakPassword}\n`);
        stdout.write(`Error toast visible as expected\n`);
    });
});
