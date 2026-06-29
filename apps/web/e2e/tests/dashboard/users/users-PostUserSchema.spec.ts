import { randomUUID } from "crypto";
import { existsSync, statSync } from "fs";
import path from "path";
import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";
import { text } from "stream/consumers";
import { stdout } from "process";


test.describe("Users - Post Users Schema", () => {

    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
    })

    test("USR-001: create new user with an email", async ({page, }) => {
        await page.goto("/register");

        const testEmail = "usr001@test.com";
        const displayName = "user";
        const testPassword = "SecurePass123!";


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

        const testUsername = `usr002-${randomUUID().slice(0, 8)}`;
        const testName = "Test User";
        const testPassword = "SecurePass123!";

        const responsePromise = page.waitForResponse( response =>
            response.url().includes("/api/v1/users") && 
            response.request().method() === "POST"
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
        
        stdout.write(`Created user: ${JSON.stringify(user)}\n`);
        stdout.write(`Response body: ${JSON.stringify(toast)}\n`);
    });

    test("USR-003: reject creating user with duplicate username", async ({ page, request, baseURL }) => {
        const random = randomUUID().slice(0, 8);
        const testUsername = `usr003-${random}`;
        const testPassword = "SecurePass123!";

        const createResponse = await request.post(`/api/v1/users`, {
            data: { username: testUsername, password: testPassword },
        });
        expect(createResponse.status()).toBe(201);

        await page.goto("/register");

        await page.getByTestId("display-name-input").fill("Duplicate User");
        await page.getByTestId("username-input").fill(testUsername);
        await page.getByTestId("password-input").fill(testPassword);
        await page.getByTestId("password-confirm-input").fill(testPassword);
        await page.getByTestId("register-button").click();

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "error");

        stdout.write(`Attempted to create duplicate user: ${testUsername}\n`);
        stdout.write(`Response body: ${JSON.stringify(toast)}\n`);
    });

    test("USR-004: normalize uppercase username to lowercase", async ({page, }) => {
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

        const user = (await response.json()).response;
        expect(user).toHaveProperty("username", testUsernameLower);
        expect(user).toHaveProperty("createdAt");

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "success");

        stdout.write(`Created user: ${JSON.stringify(user)}\n`);
        stdout.write(`Response body: ${JSON.stringify(toast)}\n`);
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
                    username: uniqueUsername,
                    name: newName,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);

        const updateBody = await updateResponse.json();
        const updated = updateBody.response;

        expect(updated).toHaveProperty("name", newName);
        expect(updated).toHaveProperty("id", userId);

        await authenticated.context.dispose();

        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
    });
});