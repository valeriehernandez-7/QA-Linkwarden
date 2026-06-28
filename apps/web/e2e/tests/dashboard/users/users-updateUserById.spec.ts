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
    
    test("USR-008: update existing username to a unique value", async ({ request, baseURL }) => {
        const random = randomUUID().slice(0, 8);
        const originalUsername = `008usr-${random}`;
        const password = "SecurePass123!";
        const newUsername = `usr008-${random}`;

        const createResponse = await request.post("/api/v1/users", {
            data: {
                username: originalUsername,
                password,
            },
        });
        expect(createResponse.status()).toBe(201);

        const createdUser = await createResponse.json();
        const userId = createdUser?.response?.id ?? createdUser?.id;
        expect(userId).toBeDefined();

        const authenticated = await loginAs(baseURL!, originalUsername, password);
        const updateResponse = await authenticated.context.put(
            `/api/v1/users/${userId}`,
            {
                data: {
                    username: newUsername,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);

        const updateBody = await updateResponse.json();
        const updated = updateBody.response;

        expect(updated).toHaveProperty("username", newUsername);
        expect(updated).toHaveProperty("id", userId);

        await authenticated.context.dispose();

        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
    });

    test("USR-009: upload JPEG avatar base64 under 1.5MB", async ({ request, baseURL }) => {
        const uniqueUsername = `usr009-${randomUUID().slice(0, 8)}`;
        const password = "SecurePass123!";
        const base64Avatar =
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAgEAABBAICAwEAAAAAAAAAAAABAgMEBRESIQAGMRQi/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAZEQEAAgMAAAAAAAAAAAAAAAABABESIzH/2gAMAwEAAhEDEQA/AMgAAA//Z";

        const createResponse = await request.post("/api/v1/users", {
            data: {
                username: uniqueUsername,
                password,
            },
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
                    image: base64Avatar,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);

        const updateBody = await updateResponse.json();
        const updated = updateBody.response;
        expect(updated).toHaveProperty("image");
        expect(updated.image).toContain(`uploads/avatar/${userId}.jpg`);

        await authenticated.context.dispose();

        
        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
    });

    test("USR-010: change password with old password", async ({ request, baseURL }) => {
        const username = `usr010-${randomUUID().slice(0, 8)}`;
        const oldPassword = "OldPass1!";
        const newPassword = "NewPass2!";

        const createResponse = await request.post("/api/v1/users", {
            data: {
                username,
                password: oldPassword,
            },
        });
        expect(createResponse.status()).toBe(201);

        const createdUser = await createResponse.json();
        const userId = createdUser?.response?.id ?? createdUser?.id;
        expect(userId).toBeDefined();

        const authenticated = await loginAs(baseURL!, username, oldPassword);
        const updateResponse = await authenticated.context.put(
            `/api/v1/users/${userId}`,
            {
                data: {
                    username,
                    oldPassword,
                    newPassword,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);

        const updateBody = await updateResponse.json();
        const updated = updateBody.response;
        expect(updated).toHaveProperty("id", userId);

        const csrfResponse = await request.get("/api/v1/auth/csrf");
        const { csrfToken } = await csrfResponse.json();

        const oldLoginResponse = await request.post(
            "/api/v1/auth/callback/credentials",
            {
                form: {
                    username,
                    password: oldPassword,
                    redirect: "false",
                    csrfToken,
                    callbackUrl: `${baseURL}/login`,
                    json: "true",
                },
            }
        );
        expect(oldLoginResponse.status()).not.toBe(200);

        const newLoginResponse = await request.post(
            "/api/v1/auth/callback/credentials",
            {
                form: {
                    username,
                    password: newPassword,
                    redirect: "false",
                    csrfToken,
                    callbackUrl: `${baseURL}/login`,
                    json: "true",
                },
            }
        );
        expect(newLoginResponse.status()).toBe(200);

        await authenticated.context.dispose();

        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
    });

    test("USR-011: update automatic archive preferences", async ({ request, baseURL }) => {
        const uniqueUsername = `usr011-${randomUUID().slice(0, 8)}`;
        const password = "SecurePass123!";

        const createResponse = await request.post("/api/v1/users", {
            data: {
                username: uniqueUsername,
                password,
            },
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
                    archiveAsScreenshot: true,
                    archiveAsPDF: false,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        const updated = updateBody.response;
        expect(updated).toHaveProperty("archiveAsScreenshot", true);
        expect(updated).toHaveProperty("archiveAsPDF", false);

        await authenticated.context.dispose();
        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
    });
    
    test("USR-012: change locale to supported language", async ({ request, baseURL }) => {
        const uniqueUsername = `usr012-${randomUUID().slice(0, 8)}`;
        const password = "SecurePass123!";
        const locale = "fr";

        const createResponse = await request.post("/api/v1/users", {
            data: {
                username: uniqueUsername,
                password,
            },
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
                    locale,
                },
            }
        );

        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        const updated = updateBody.response;
        expect(updated).toHaveProperty("locale", locale);

        await authenticated.context.dispose();
        stdout.write(`Created user: ${JSON.stringify(updateBody)}\n`);
    }); 

});
