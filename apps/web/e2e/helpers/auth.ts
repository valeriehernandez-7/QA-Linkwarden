import {
  APIRequestContext,
  request as playwrightRequest,
} from "@playwright/test";

export type AuthenticatedSession = {
  context: APIRequestContext;
  userId: number;
};

/**
 * Authenticates as the given user via NextAuth's Credentials Provider
 * (csrf -> credentials callback -> session), returning both the
 * authenticated context and the real userId resolved from the session.
 *
 * userId is never hardcoded — Postgres autoincrement ids differ per
 * environment, so it's always read back from /api/v1/auth/session.
 *
 * Usage:
 *   const member = await loginAs(baseURL, "username0", "username0");
 *   await member.context.post("/api/v1/collections", { data: {...} });
 *   await member.context.dispose();
 */
export async function loginAs(
  baseURL: string,
  username: string,
  password: string
): Promise<AuthenticatedSession> {
  const context = await playwrightRequest.newContext({ baseURL });

  const csrfResponse = await context.get("/api/v1/auth/csrf");
  const { csrfToken } = await csrfResponse.json();

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
      `loginAs("${username}") failed with status ${loginResponse.status()}. ` +
      `Check the user exists: SELECT id, username FROM "User";`
    );
  }

  const sessionResponse = await context.get("/api/v1/auth/session");
  const sessionBody = await sessionResponse.json();
  const userId = sessionBody?.user?.id;

  if (!userId) {
    throw new Error(
      `loginAs("${username}") authenticated, but /api/v1/auth/session ` +
      `returned no user.id. Response: ${JSON.stringify(sessionBody)}`
    );
  }

  return { context, userId };
}
