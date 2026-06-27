import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";

test.describe("Admin user create Account", () => {

    test("USR-023: Login with Valid credentials", async ({page, }) => {
        await page.goto("/login");

        await page.getByTestId("username-input").fill("username0");
        await page.getByTestId("password-input").fill("username0");
        await page.getByTestId("submit-login-button").click();
        await page.waitForURL(url => !url.pathname.includes("/login"), { timeout: 15000 });
        
        await page.goto("/admin/user-administration");
        await expect(page).toHaveURL(/\/admin\/user-administration/, { timeout: 10000 });
        await page.waitForLoadState("networkidle");

        //await page.locator("table").waitFor({ state: "visible" });
        await page.locator(".max-w-7xl").getByRole("button").filter({ has: page.locator("i.bi-plus") }).click();

        await page.getByPlaceholder("Johnny").fill("WaitingDeletion");
        await page.getByPlaceholder("john", { exact: true }).fill("waitingdeletion");
        await page.getByPlaceholder("••••••••••••••").fill("WaitingDeletion");

        await page.getByRole("button", { name: "Create User" }).click();

        const toast = page.getByTestId("toast-message-container").first();
        await expect(toast).toBeVisible();
        await expect(toast).toHaveAttribute("data-type", "success");

    });

});