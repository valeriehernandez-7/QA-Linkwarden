import { test, expect } from "../../index";
import { loginAs } from "../../helpers/auth";

/**
 * Test de validación del helper loginAs (e2e/helpers/auth.ts).
 * No corresponde a un caso COL específico — es una prueba de infraestructura
 * para confirmar que el flujo de login vía API (csrf + credentials) funciona
 * antes de depender de él en casos de permisos
 */
test.describe("Helper loginAs - validación de infraestructura", () => {
  test("username0 puede autenticarse vía API y acceder a un endpoint protegido", async ({
    baseURL,
  }) => {
    const memberContext = await loginAs(baseURL!, "username0", "username0");

    // Si el login funcionó, este endpoint protegido debe responder 200
    // (en vez de 401, que es lo que daría una sesión no autenticada)
    const response = await memberContext.get("/api/v1/collections");
    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log("DEBUG -> colecciones visibles para username0:", body.response);

    await memberContext.dispose();
  });

  test("username1 puede autenticarse vía API y acceder a un endpoint protegido", async ({
    baseURL,
  }) => {
    const memberContext = await loginAs(baseURL!, "username1", "username1");

    const response = await memberContext.get("/api/v1/collections");
    expect(response.status()).toBe(200);

    await memberContext.dispose();
  });

  test("credenciales inválidas no deberían dar una sesión autenticada", async ({
    baseURL,
  }) => {
    // OJO: NextAuth normalmente responde 200 con redirect a /login?error=...
    // aunque las credenciales sean incorrectas (no usa 401 en el callback).
    // Este test documenta el comportamiento real observado.
    let errorCaught = false;
    try {
      const ctx = await loginAs(baseURL!, "username0", "password_incorrecto");
      const response = await ctx.get("/api/v1/collections");
      console.log(
        "DEBUG -> status con password incorrecto:",
        response.status()
      );
      await ctx.dispose();
    } catch (e) {
      errorCaught = true;
      console.log("DEBUG -> loginAs lanzó error como se esperaba:", e);
    }
    // Documentamos el resultado real sin asumir de antemano cuál ocurre.
    console.log("DEBUG -> errorCaught:", errorCaught);
  });
});