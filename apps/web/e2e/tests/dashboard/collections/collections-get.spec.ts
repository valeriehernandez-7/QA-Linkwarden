import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";
import { request as playwrightRequest } from "@playwright/test";

/**
 * Module: Collections (COL)
 * Endpoint: GET /api/v1/collections
 * Covers: COL-005, COL-006, COL-017
 */

test.describe("Collections - GET /api/v1/collections", () => {
  let createdIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await request.delete(`/api/v1/collections/${id}`).catch(() => {});
    }
    createdIds = [];
  });

  test("COL-005 (DV): lists owned and shared collections together", async ({
    request,
    baseURL,
  }) => {
    // 3 owned collections
    for (const name of ["Owned A", "Owned B", "Owned C"]) {
      const res = await request.post("/api/v1/collections", { data: { name } });
      createdIds.push((await res.json()).response.id);
    }

    // 1 collection shared with qa-tester by username0
    const member = await loginAs(baseURL!, "username0", "username0");
    const sharedRes = await member.context.post("/api/v1/collections", {
      data: { name: "Shared by username0" },
    });
    const shared = (await sharedRes.json()).response;
    createdIds.push(shared.id);

    const sessionRes = await request.get("/api/v1/auth/session");
    const { user } = await sessionRes.json();

    await member.context.put(`/api/v1/collections/${shared.id}`, {
      data: {
        id: shared.id,
        name: shared.name,
        members: [
          { userId: user.id, canCreate: true, canUpdate: true, canDelete: true },
        ],
      },
    });

    const response = await request.get("/api/v1/collections");
    expect(response.status()).toBe(200);

    const body = await response.json();
    const ids = body.response.map((c: any) => c.id);

    expect(ids).toEqual(
      expect.arrayContaining(
        [...createdIds]
      )
    );

    await member.context.dispose();
  });

  test("COL-006 (DV): a collection shared by another user appears in the listing", async ({
    request,
    baseURL,
  }) => {
    const sessionRes = await request.get("/api/v1/auth/session");
    const { user: owner } = await sessionRes.json();

    const collectionRes = await request.post("/api/v1/collections", {
      data: { name: "Compartida con username1" },
    });
    const collection = (await collectionRes.json()).response;
    createdIds.push(collection.id);

    const member = await loginAs(baseURL!, "username1", "username1");

    await request.put(`/api/v1/collections/${collection.id}`, {
      data: {
        id: collection.id,
        name: collection.name,
        members: [
          {
            userId: member.userId,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
        ],
      },
    });

    const response = await member.context.get("/api/v1/collections");
    expect(response.status()).toBe(200);

    const body = await response.json();
    const sharedCollection = body.response.find(
      (c: any) => c.id === collection.id
    );

    expect(sharedCollection).toBeDefined();
    expect(sharedCollection.ownerId).toBe(owner.id);

    await member.context.dispose();
  });

  test("COL-017 (DV): a user with no collections gets an empty array", async ({
    baseURL,
  }) => {
    // username2 is reserved exclusively for cases needing a guaranteed
    // "clean" user (no owned or shared collections). It must never be
    // used as a member/owner in any other test in this suite — Playwright
    // doesn't guarantee execution order across files, so relying on
    // "this runs before username1 gets used elsewhere" would be flaky.
    const member = await loginAs(baseURL!, "username2", "username2");

    const response = await member.context.get("/api/v1/collections");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response).toEqual([]);

    await member.context.dispose();
  });

  test("COL-017 (DI): an unauthenticated request is rejected with 401", async ({
    baseURL,
  }) => {
    // Explicit empty storageState: without this, newContext() can inherit
    // the project's default storageState (set in playwright.config.ts for
    // the "chromium dashboard" project), defeating the purpose of testing
    // an unauthenticated request.
    const anonymousContext = await playwrightRequest.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });

    const response = await anonymousContext.get("/api/v1/collections");
    expect(response.status()).toBe(401);

    await anonymousContext.dispose();
  });
});