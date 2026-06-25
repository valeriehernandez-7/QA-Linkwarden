import { APIRequestContext, request as playwrightRequest } from "@playwright/test";

/**
 * Resultado de loginAs: el contexto autenticado + el userId real, obtenido
 * dinámicamente de la sesión (NUNCA hardcodeado), para que la suite funcione
 * igual en cualquier ambiente/base de datos, sin importar qué id le haya
 * tocado a ese usuario en esa instancia particular.
 */
export type AuthenticatedSession = {
  context: APIRequestContext;
  userId: number;
};

/**
 * Crea un nuevo APIRequestContext autenticado como el usuario indicado,
 * usando el flujo real de NextAuth Credentials Provider:
 *   1. GET /api/v1/auth/csrf       -> obtiene csrfToken + cookie next-auth.csrf-token
 *   2. POST /api/v1/auth/callback/credentials -> login con username/password + csrfToken
 *   3. GET /api/v1/auth/session    -> obtiene el userId real de la sesión recién creada
 *
 * Confirmado empíricamente con DevTools (Network tab) contra una instancia
 * real de Linkwarden v2.14.1.
 *
 * IMPORTANTE: el userId se obtiene SIEMPRE de la sesión, nunca se hardcodea,
 * porque cada instancia/base de datos puede asignar IDs distintos al mismo
 * username (autoincremento de Postgres, no es estable entre ambientes).
 *
 * Uso típico en un test:
 *   const member = await loginAs(baseURL, "username0", "username0");
 *   const response = await member.context.post("/api/v1/collections", {...});
 *   // member.userId -> el id real de username0 en ESTA base de datos
 *   await member.context.dispose();
 */
export async function loginAs(
  baseURL: string,
  username: string,
  password: string
): Promise<AuthenticatedSession> {
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

  // Paso 3: resolver el userId real desde la sesión recién creada
  const sessionResponse = await context.get("/api/v1/auth/session");
  const sessionBody = await sessionResponse.json();
  const userId = sessionBody?.user?.id;

  if (!userId) {
    throw new Error(
      `loginAs("${username}") autenticó correctamente, pero ` +
        `/api/v1/auth/session no devolvió un user.id válido. ` +
        `Respuesta recibida: ${JSON.stringify(sessionBody)}`
    );
  }

  return { context, userId };
}