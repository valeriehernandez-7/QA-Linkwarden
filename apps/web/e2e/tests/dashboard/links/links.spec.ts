import { test, expect } from "../../../index";

test.describe.configure({ mode: "serial" });

test.describe("LNK", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto("/links");
        await page.waitForLoadState("networkidle")
    })

    test("LNK-001 - Crear link con url valida", async ({ page }) => {
        const url = "https://codeforces.com/";

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        // llenar el campo de url
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        // apretar el boton de crear
        await page.getByRole("button", { name: "Create Link" }).click();

        await expect(page.getByTestId("modal-container")).not.toBeVisible();

        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
    })

    test("LNK-003 - Crear link con nombre propio", async ({ page }) => {
        const url = "https://www.hola.com/";
        const name = "Hola";

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        // llenar el campo de url
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        // desplegar mas opciones
        await page.getByRole("button", { name: "More Options" }).click();

        // llenar el campo de nombre
        await page.getByPlaceholder("Will be auto generated if left empty.").fill(name);

        // apretar el boton de crear
        await page.getByRole("button", { name: "Create Link" }).click();

        await expect(page.getByTestId("modal-container")).not.toBeVisible();

        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
        await expect(page.locator("p.truncate.text-primary", { hasText: name }).first()).toBeVisible();
    })

    test("LNK-004 - tag personalizado", async ({ page }) => {
        const url = "https://www.hola2.com/";
        const tag = "tag1";

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        // llenar el campo de url
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        // desplegar mas opciones
        await page.getByRole("button", { name: "More Options" }).click();

        await page.locator(`xpath=/html/body/div[3]/div/div/div[3]/div[2]/div/div/div[1]/div[2]/input`).fill(tag);
        await page.keyboard.press("Enter");

        // apretar el boton de crear
        await page.getByRole("button", { name: "Create Link" }).click();

        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
    })

    test("LNK-005 - link con descripcion", async ({ page }) => {
        const url = "https://www.hola3.com/";
        const descripcion = "Hola todo el mundo"

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        await page.getByRole("button", { name: "More Options" }).click();

        await page.locator("xpath=/html/body/div[3]/div/div/div[3]/div[3]/textarea").fill(descripcion);

        await page.getByRole("button", { name: "Create Link" }).click();
        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
    })

    test("LNK-006 - link con coleccion personalizada", async ({ page }) => {
        const url = "https://www.hola8.com/";
        const coleccion = "nuevo4"

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        await expect(page.getByTestId("modal-container")).toBeVisible();
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        await page.locator("xpath=/html/body/div[3]/div/div/div[2]/div[2]/div/div/div[1]/div[2]/input").fill(coleccion);
        await page.keyboard.press("Enter");

        await page.getByRole("button", { name: "Create Link" }).click();

        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
        await expect(page.locator(`a[title=${coleccion}]`).first()).toBeVisible();
    })

    test("LNK-008 - actualizar url de un link", async ({ page }) => {
        const newUrl = "https://www.nuevo2.com/";
        const urlVieja = "https://www.viejo.com";

        // crear link
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();
        await expect(page.getByTestId("modal-container")).toBeVisible();
        await page.getByPlaceholder("e.g. http://example.com/").fill(urlVieja);
        await page.getByRole("button", { name: "Create Link" }).click();
        await expect(page.locator(`a[title="${urlVieja}"]`).first()).toBeVisible();

        // actualizar
        const card = page.locator("div.h-full").filter({
            has: page.locator(`a[title="${urlVieja}"]`)
        }).first();
        await card.hover();
        await card.locator("i[title='More']").first().click();
        await page.getByRole("menuitem", { name: "Edit Link" }).click();

        let inputUrl = page.locator("xpath=/html/body/div[4]/div/div[2]/div/div/div[3]/div[2]/input");
        inputUrl.clear();
        inputUrl.fill(newUrl);

        await page.getByRole("button", { name: "Save Changes" }).click();

        await expect(page.locator(`a[title="${newUrl}"]`, { hasText: newUrl })).toBeVisible();
    })

    // test("LNK-007 - actualizar nombre de un link", async ({ page }) => {
    //     const nuevoNombre = "Hola soy recontra nuevo";
    //     const viejoNombre = "Hola";
    //     const urlVieja = "https://www.viejo.com";

    //     // crear link
    //     await page.getByRole('button', { name: ' ' }).first().click();
    //     await page.locator("xpath=/html/body/div[3]/div/div[1]").click();
    //     await expect(page.getByTestId("modal-container")).toBeVisible();
    //     await page.getByPlaceholder("e.g. http://example.com/").fill(urlVieja);
    //     await page.getByRole("button", { name: "More Options" }).click();
    //     await page.getByPlaceholder("Will be auto generated if left empty.").fill(viejoNombre);
    //     await page.getByRole("button", { name: "Create Link" }).click();
    //     await expect(page.locator(`a[title="${urlVieja}"]`).first()).toBeVisible();

    //     // actualizar
    //     const card = page.locator("div.h-full").filter({
    //         has: page.locator(`a[title="${urlVieja}"]`)
    //     }).first();
    //     await card.hover();
    //     await card.locator("i[title='More']").first().click();
    //     await page.getByRole("menuitem", { name: "Edit Link" }).click();

    //     const inputName = page.locator("xpath=/html/body/div[4]/div/div[2]/div/div/div[3]/div[1]/input")
    //     await inputName.click({ clickCount: 3 });
    //     await page.keyboard.type(nuevoNombre, { delay: 50 });

    //     await page.getByRole("button", { name: "Save Changes" }).click();

    //     await expect(page.locator("p.relative.w-fit", { hasText: nuevoNombre })).toBeVisible();
    // })

    test("LNK-009 - actualizar tags de un link", async ({ page }) => {
        const newTags = ["dev", "tailwind", "hola"];
        const url = "https://www.hola2.com/";
        const tag = "tag1";

        // Crear link con tag
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();
        await expect(page.getByTestId("modal-container")).toBeVisible();
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);
        await page.getByRole("button", { name: "More Options" }).click();
        await page.locator(`xpath=/html/body/div[3]/div/div/div[3]/div[2]/div/div/div[1]/div[2]/input`).fill(tag);
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "Create Link" }).click();
        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();

        const card = page.locator("div.h-full").filter({
            has: page.locator(`a[title="${url}"]`)
        }).first();
        await card.hover();
        await card.locator("i[title='More']").first().click();
        await page.getByRole("menuitem", { name: "Edit Link" }).click();

        const input = page.locator("input.react-select__input").last();
        for (const tag of newTags) {
            await input.fill(tag);
            await page.keyboard.press("Enter");
        }

        await page.getByRole("button", { name: "Save Changes" }).click();
    })

    test("LNK-010 - asignar varios pines a links", async ({ page }) => {
        const urls = ["https://http.cat/", "http://localhost:3000/links", "https://github.com/"]

        // Crear link
        for (const url of urls) {
            await page.getByRole('button', { name: ' ' }).first().click();
            await page.locator("xpath=/html/body/div[3]/div/div[1]").click();
            await expect(page.getByTestId("modal-container")).toBeVisible();
            await page.getByPlaceholder("e.g. http://example.com/").fill(url);
            await page.getByRole("button", { name: "Create Link" }).click();
            await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
        }

        for (const url of urls) {
            const card = page.locator("div.border.border-solid.border-neutral-content").filter({
                has: page.locator(`a[title="${url}"]`)
            }).first();
            await card.hover();
            await card.locator("button:has(i[title='Pin'])").click();
        }

        await page.goto("/links/pinned")
        for (const url of urls) {
            await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
        }
    })

    test("LNK-011 - cambiar una coleccion de un link", async ({ page }) => {
        const nuevaColeccion = "Unorganized";
        const viejaColeccion = "nuevo4"
        const url = "https://www.hola10.com/";

        // CREAR LINK CON COLECCION 
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        await expect(page.getByTestId("modal-container")).toBeVisible();
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        await page.locator("xpath=/html/body/div[3]/div/div/div[2]/div[2]/div/div/div[1]/div[2]/input").fill(viejaColeccion);
        await page.keyboard.press("Enter");

        await page.getByRole("button", { name: "Create Link" }).click();

        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();
        await expect(page.locator(`a[title=${viejaColeccion}]`).first()).toBeVisible();

        // CAMBIAR COLECCION
        const card = page.locator("div.h-full").filter({
            has: page.locator(`a[title="${url}"]`)
        }).first();
        await card.hover();
        await card.locator("i[title='More']").first().click();
        await page.getByRole("menuitem", { name: "Edit Link" }).click();

        await page.locator("xpath=/html/body/div[4]/div/div[2]/div/div/div[3]/div[3]/div/div/div[1]/div[2]/input").fill(nuevaColeccion);
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "Save Changes" }).click();

        await expect(page.locator("a[href*='/collections/'] p", { hasText: nuevaColeccion }).first()).toBeVisible();
    })

    test("LNK-012 - eliminar un link con exito", async ({ page }) => {
        const url = "https://www.hola10.com/";

        // CREAR LINK
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();
        await expect(page.getByTestId("modal-container")).toBeVisible();
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);
        await page.getByRole("button", { name: "Create Link" }).click();
        await expect(page.locator(`a[title="${url}"]`).first()).toBeVisible();

        // Eliminar link
        const card = page.locator("div.h-full").filter({
            has: page.locator(`a[title="${url}"]`)
        }).first();
        await card.hover();
        await card.locator("i[title='More']").first().click();
        await page.getByRole("menuitem", { name: "Delete" }).click();

        await page.locator("button.bg-destructive").click();
    })

    test("LNK-013 - Crear link con url invalida", async ({ page }) => {
        const url = "ElPepe";

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        // llenar el campo de url
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        // apretar el boton de crear
        await page.getByRole("button", { name: "Create Link" }).click();

        const msg = page.getByTestId("toast-message-container").first();
        await expect(msg).toBeVisible();
        await expect(msg).toHaveAttribute("data-type", "error");
    })

    test("LNK-014 - Crear link con url que exceda los limites de caracteres", async ({ page }) => {
        const url = `https://www.hola${"a".repeat(2050)}.com/`;

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        // llenar el campo de url
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        // apretar el boton de crear
        await page.getByRole("button", { name: "Create Link" }).click();

        const msg = page.getByTestId("toast-message-container").first();
        await expect(msg).toBeVisible();
        await expect(msg).toHaveAttribute("data-type", "error");
    })

    test("LNK-015 - tag que exceda los limites de caracteres", async ({ page }) => {
        const url = "https://www.hola2.com/";
        const tag = `tag${"1".repeat(50)}`;

        // presionar boton
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();

        // esperar a que se abra el contenedor
        await expect(page.getByTestId("modal-container")).toBeVisible();

        // llenar el campo de url
        await page.getByPlaceholder("e.g. http://example.com/").fill(url);

        // desplegar mas opciones
        await page.getByRole("button", { name: "More Options" }).click();

        await page.locator(`xpath=/html/body/div[3]/div/div/div[3]/div[2]/div/div/div[1]/div[2]/input`).fill(tag);
        await page.keyboard.press("Enter");

        // apretar el boton de crear
        await page.getByRole("button", { name: "Create Link" }).click();

        const msg = page.getByTestId("toast-message-container").first();
        await expect(msg).toBeVisible();
        await expect(msg).toHaveAttribute("data-type", "error");
    })

    test("LNK-018 - actualizar con url invalida de un link", async ({ page }) => {
        const urlVieja = "https://www.hola.com/";
        const urlNueva = `https://www.hola${"a".repeat(2050)}.com/`;

        // CREAR LINK
        await page.getByRole('button', { name: ' ' }).first().click();
        await page.locator("xpath=/html/body/div[3]/div/div[1]").click();
        await expect(page.getByTestId("modal-container")).toBeVisible();
        await page.getByPlaceholder("e.g. http://example.com/").fill(urlVieja);
        await page.getByRole("button", { name: "Create Link" }).click();
        await expect(page.locator(`a[title="${urlVieja}"]`).first()).toBeVisible();

        // actualizar
        const card = page.locator("div.h-full").filter({
            has: page.locator(`a[title="${urlVieja}"]`)
        }).first();
        await card.hover();
        await card.locator("i[title='More']").first().click();
        await page.getByRole("menuitem", { name: "Edit Link" }).click();

        const inputUrl = page.locator("xpath=/html/body/div[4]/div/div[2]/div/div/div[3]/div[2]/input");
        inputUrl.clear();
        inputUrl.fill(urlNueva);

        await page.getByRole("button", { name: "Save Changes" }).click();

        const msg = page.getByTestId("toast-message-container").first();
        await expect(msg).toBeVisible();
        await expect(msg).toHaveAttribute("data-type", "error");
    })
})