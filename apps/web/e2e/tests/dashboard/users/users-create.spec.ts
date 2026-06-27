import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";


test.describe("Create Users", () => {
  test("USR-001: create new user account with existing username", async ({page, }) => {
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

  test("USR-002: create new user with password less than 8 characters", async ({page, }) => {
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

  test("USR-003: create new user with password and confirm password not matching", async ({page, }) => {
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

  /*
  test("USR-004: create new user with valid credentials", async ({page, }) => {
    await page.goto("/register");

    await page.getByTestId("display-name-input").fill();
    await page.getByTestId("username-input").fill("testuser");
    await page.getByTestId("password-input").fill("username0");
    await page.getByTestId("password-confirm-input").fill("username1");

    await page.getByTestId("register-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });
  */

  test("USR-005: create user with empty display name", async ({page, }) => {
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

  test("USR-006: create user with empty username", async ({page, }) => {
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

  test("USR-007: create user with empty password", async ({page, }) => {
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

  test("USR-008: create user with empty confirm password", async ({page, }) => {
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

  test("USR-009: create user with empty display name, username, password and confirm password", async ({page, }) => {
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