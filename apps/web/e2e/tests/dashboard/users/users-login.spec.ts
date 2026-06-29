import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";


test.describe("Users - Login Users via /login", () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  })

  test("USR-023: login with valid credentials", async ({page, }) => {
    await page.goto("/login");

    await page.getByTestId("username-input").fill("testing_username");
    await page.getByTestId("password-input").fill("testing_password");

    await page.getByTestId("submit-login-button").click();

    const toast = page.getByTestId("toast-message-container").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
  });

});