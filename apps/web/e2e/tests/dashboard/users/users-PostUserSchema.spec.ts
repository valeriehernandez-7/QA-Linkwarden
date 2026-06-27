import { randomUUID } from "crypto";
import { existsSync, statSync } from "fs";
import path from "path";
import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";
import { text } from "stream/consumers";


test.describe("Users - Create Users", () => {

    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
    })

       test("USR-001: create new user with an email", async ({page, }) => {
        await page.goto("/register");

        // Pasos: Enviar datos válidos para crear usuario con email
        const testEmail = "user@test.com";
        const testPassword = "SecurePass123!";
        const displayName = "user";


        await page.getByTestId("display-name-input").fill(displayName);
        await page.getByTestId("username-input").fill(testEmail);
        await page.getByTestId("password-input").fill(testPassword);
        await page.getByTestId("password-confirm-input").fill(testPassword);
        
        await page.getByTestId("register-button").click();


        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "error");

    });

    test("USR-002: create new user with a name", async ({page, }) => {
        await page.goto("/register");

        const testUsername = `usr002-${randomUUID().slice(0, 8)}`;   // valid: matches /^[a-z0-9_-]{3,50}$/
        const testName = "Test User";
        const testPassword = "SecurePass123!";

        const responsePromise = page.waitForResponse(response =>
            response.url().includes("/api/v1/users") && response.request().method() === "POST"
        );

        await page.getByTestId("display-name-input").fill(testName);
        await page.getByTestId("username-input").fill(testUsername);
        await page.getByTestId("password-input").fill(testPassword);
        await page.getByTestId("password-confirm-input").fill(testPassword);
        await page.getByTestId("register-button").click();

        const response = await responsePromise;
        expect(response.status()).toBe(201);

        const responseBody = await response.json();
        const user = responseBody.response;

        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("username", testUsername);
        expect(user).toHaveProperty("name", testName);
        expect(user).toHaveProperty("createdAt");

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "success");
    });

    test("USR-003: create new user with promotional email preference", async ({page, }) => {
        await page.goto("/register");

        const testUsername = `usr003-${randomUUID().slice(0, 8)}`;
        const testPassword = "SecurePass123!";

        const responsePromise = page.waitForResponse(
            response =>
                response.url().includes("/api/v1/users") &&
                response.request().method() === "POST"
        );

        await page.getByTestId("display-name-input").fill("Promo User"); // ✅ required field
        await page.getByTestId("username-input").fill(testUsername);
        await page.getByTestId("password-input").fill(testPassword);
        await page.getByTestId("password-confirm-input").fill(testPassword);

        const promoCheckbox = page.locator("[data-testid=accept-promotional-emails]");
        if (await promoCheckbox.count() > 0 && !(await promoCheckbox.isChecked())) {
            await promoCheckbox.check();
        }

        await page.getByTestId("register-button").click();

        const response = await responsePromise;
        expect(response.status()).toBe(201);

        const user = (await response.json()).response;
        expect(user).toHaveProperty("username", testUsername);
        expect(user).toHaveProperty("createdAt");

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "success");
    });

    test("USR-004: normalize uppercase email to lowercase", async ({page, }) => {
        await page.goto("/register");

        const random = randomUUID().slice(0, 8);
        const testUsernameUpper = `USR004-${random}`;
        const testUsernameLower = `usr004-${random}`;
        const testPassword = "SecurePass123!";

        const responsePromise = page.waitForResponse(
            response =>
                response.url().includes("/api/v1/users") &&
                response.request().method() === "POST"
        );

        await page.getByTestId("display-name-input").fill("Test User");
        await page.getByTestId("username-input").fill(testUsernameUpper);
        await page.getByTestId("password-input").fill(testPassword);
        await page.getByTestId("password-confirm-input").fill(testPassword);
        await page.getByTestId("register-button").click();

        const response = await responsePromise;
        expect(response.status()).toBe(201);

        const user = (await response.json()).response; // ✅ unwrap nested response
        expect(user).toHaveProperty("username", testUsernameLower); // ✅ expect lowercased
        expect(user).toHaveProperty("createdAt");

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "success");
    });
    
    test("USR-007: update existing user name", async ({ request, baseURL }) => {
        const random = randomUUID().slice(0, 8);
        const uniqueUsername = `007usr-${random}`;
        const password = "SecurePass123!";
        const newName = `usr007-${random}`;

        const createResponse = await request.post("/api/v1/users", {
            data: { username: uniqueUsername, password },
        });
        expect(createResponse.status()).toBe(201);

        const createdUser = await createResponse.json();
        const userId = createdUser?.response?.id ?? createdUser?.id;
        expect(userId).toBeDefined();

        const authenticated = await loginAs(baseURL!, uniqueUsername, password);

        const updateResponse = await authenticated.context.put(
            `/api/v1/users/${userId}`,
            {
                data: {
                    username: uniqueUsername, // ✅ required by PUT schema even when unchanged
                    name: newName,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);

        const updateBody = await updateResponse.json();
        const updated = updateBody.response; // ✅ unwrap

        expect(updated).toHaveProperty("name", newName);
        expect(updated).toHaveProperty("id", userId);

        await authenticated.context.dispose();
    });



});