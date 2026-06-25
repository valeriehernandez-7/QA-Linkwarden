import { APIRequestContext, request as playwrightRequest } from "@playwright/test";

/**
 * Crea un nuevo APIRequestContext autenticado como el usuario indicado,
 * usando el flujo real de NextAuth Credentials Provider:
 *   1. GET /api/v1/auth/csrf       -> obtiene csrfToken + cookie next-auth.csrf-token
 *   2. POST /api/v1/auth/callback/credentials -> login con username/password + csrfToken
 *
 * Confirmado empíricamente con DevTools (Network tab) contra una instancia
 * real de Linkwarden v2.14.1. Body esperado por el endpoint (form-urlencoded):
 *   username, password, redirect=false, csrfToken, callbackUrl, json=true
 *
 * Uso típico en un test:
 *   const memberContext = await loginAs(baseURL, "username0", "username0");
 *   const response = await memberContext.post("/api/v1/collections", {...});
 *   await memberContext.dispose(); // liberar recursos al terminar
 */
export async function loginAs(
  baseURL: string,
  username: string,
  password: string
): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL });

  // Paso 1: obtener csrfToken
  const csrfResponse = await context.get("/api/v1/auth/csrf");
  const { csrfToken } = await csrfResponse.json();

  // Paso 2: login con credenciales + csrfToken
  const loginResponse = await context.post(
    "/api/v1/auth/callback/credentials",
    {
      form: {
        username,
        password,
        redirect: "false",
        csrfToken,
        callbackUrl: `${baseURL}/login`,
        json: "true",
      },
    }
  );

  if (loginResponse.status() !== 200) {
    throw new Error(
      `loginAs("${username}") falló con status ${loginResponse.status()}. ` +
        `Verifica que el usuario exista (SELECT id, username FROM "User";).`
    );
  }

  return context;
}