import { randomUUID } from "crypto";
import { existsSync, statSync } from "fs";
import path from "path";
import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";
import { text } from "stream/consumers";

test.describe("Create Users", () => {
  test("USR-014: create new user account with existing username", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("username0");
    await page.getByTestId("username-input").fill("username0");
    await page.getByTestId("password-input").fill("username0");
    await page.getByTestId("password-confirm-input").fill("username0");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  test("USR-015: create new user with password less than 8 characters", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("testuser");
    await page.getByTestId("username-input").fill("testuser");
    await page.getByTestId("password-input").fill("a");
    await page.getByTestId("password-confirm-input").fill("a");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  test("USR-016: create new user with password and confirm password not matching", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("testuser");
    await page.getByTestId("username-input").fill("testuser");
    await page.getByTestId("password-input").fill("username0");
    await page.getByTestId("password-confirm-input").fill("username1");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  
  test("USR-017: create new user with valid credentials", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("testuser");
    await page.getByTestId("username-input").fill("testuser");
    await page.getByTestId("password-input").fill("username0");
    await page.getByTestId("password-confirm-input").fill("username1");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });
  

  test("USR-018: create user with empty display name", async ({page, }) => {
    await page.goto("/register");

    //await page.getByTestId("display-name-input").fill("");
    await page.getByTestId("username-input").fill("usernamex");
    await page.getByTestId("password-input").fill("usernamex");
    await page.getByTestId("password-confirm-input").fill("usernamex");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  test("USR-019: create user with empty username", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("");
    //await page.getByTestId("username-input").fill("");
    await page.getByTestId("password-input").fill("usernamex");
    await page.getByTestId("password-confirm-input").fill("usernamex");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  test("USR-020: create user with empty password", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("usernamex");
    await page.getByTestId("username-input").fill("usernamex");
    //await page.getByTestId("password-input").fill("usernamex");
    await page.getByTestId("password-confirm-input").fill("usernamex");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  test("USR-021: create user with empty confirm password", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill("usernamex");
    await page.getByTestId("username-input").fill("usernamex");
    await page.getByTestId("password-input").fill("usernamex");
    //await page.getByTestId("password-confirm-input").fill("usernamex");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

  test("USR-022: create user with empty display name, username, password and confirm password", async ({page, }) => {
    await page.goto("/register");

    //await page.getByTestId("display-name-input").fill("usernamex");
    //await page.getByTestId("username-input").fill("usernamex");
    //await page.getByTestId("password-input").fill("usernamex");
    //await page.getByTestId("password-confirm-input").fill("usernamex");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });


});