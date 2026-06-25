import { test, expect } from "../../index";

/**
 * Módulo: Collections (COL)
 * Endpoint: POST /api/v1/collections
 * Referencia: Proyecto Avance 3, casosd de prueba COL-001 a COL-004
 *
 * Estas pruebas usan el cliente `request` de Playwright, autenticado mediante
 * el storageState generado en tests/global/setup.dashboard.ts (proyecto "chromium dashboard").
 */

test.describe("Collections - POST /api/v1/collections", () => {
  test("COL-001 (DV): crea una colección raíz con solo el nombre", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "Proyectos 2026" },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.name).toBe("Proyectos 2026");
    expect(body.response.parentId).toBeNull();
  });

  test("COL-001 (DI): rechaza un nombre vacío [DEFECTO DEF-COL-001]", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "" },
    });

    // COMPORTAMIENTO ESPERADO (según avance 1, COL-001): 400 "Required [name]"
    // COMPORTAMIENTO REAL OBSERVADO: 200, la colección se crea con name: ""
    // CAUSA RAÍZ: PostCollectionSchema (schemaValidation.ts) define
    //   name: z.string().trim().max(2048)
    // sin .min(1)/.nonempty(), por lo que un string vacío es válido para Zod.
    // Reportado como defecto DEF-COL-001 (prioridad media) en sección 6 del informe.
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.name).toBe("");
  });

  test("COL-002 (DV): crea una colección con todos los campos opcionales", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: {
        name: "Recursos",
        description: "Enlaces útiles",
        color: "#0ea5e9",
        icon: "star",
        iconWeight: "bold",
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.description).toBe("Enlaces útiles");
    expect(body.response.color).toBe("#0ea5e9");
    expect(body.response.icon).toBe("star");
    expect(body.response.iconWeight).toBe("bold");
  });

  test("COL-002 (DI): rechaza un color que excede 50 caracteres", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: {
        name: "Recursos",
        color: "#" + "a".repeat(51),
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.response).toContain("50 characters");
    expect(body.response).toContain("[color]");
  });

  test("COL-003 (DV): crea una subcolección con parentId válido", async ({
    request,
  }) => {
    // Arrange: crear la colección padre primero
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-003" },
    });
    const parent = (await parentResponse.json()).response;

    // Act
    const response = await request.post("/api/v1/collections", {
      data: { name: "Backend", parentId: parent.id },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.parentId).toBe(parent.id);
    expect(body.response.ownerId).toBe(parent.ownerId);
  });

  test("COL-003 (DI): rechaza un parentId inexistente con 403 (no 404)", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "Backend", parentId: 999999 },
    });

    // COMPORTAMIENTO ESPERADO según avance 1 (COL-003): 404 "Parent collection not found"
    // COMPORTAMIENTO REAL CONFIRMADO: 403 "...not authorized to create a sub-collection..."
    // CAUSA RAÍZ: en postCollection.ts, la verificación de permisos
    // (memberHasAccess / ownerId) ocurre ANTES de resolver el parentId contra
    // la base de datos. Con un usuario sin relación previa a ese id (exista o no),
    // siempre cae en el bloque 403 antes de poder llegar al 404.
    // El 404 solo sería alcanzable si el usuario SÍ tuviera permisos sobre un
    // parentId que de algún modo deja de existir entre la verificación de
    // permisos y la resolución del padre (condición de carrera, poco realista).
    // Documentado como aclaración de COL-003/COL-025 (no se reporta como
    // defecto: la respuesta 403 sigue siendo una denegación válida y segura).
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.response).toContain(
      "not authorized to create a sub-collection"
    );
  });
});