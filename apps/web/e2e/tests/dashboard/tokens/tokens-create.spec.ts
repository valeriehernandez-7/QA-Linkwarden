import { randomUUID } from "crypto";
import { test, expect } from "../../../index";
import { text } from "stream/consumers";


test.describe("Create tokens", () => {

    test("TOK-001: create new token with valid credentials", async ({page, }) => {
        await page.goto("/dashboard/tokens");

        await page.getByTestId("token-name-input").fill("testtoken");
        await page.getByTestId("token-create-button").click();

  });
});