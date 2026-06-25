import { test, expect } from "../../../index";

/**
 * Module: Collections (COL)
 * Endpoint: POST /api/v1/collections
 * Covers: COL-015, COL-016, COL-019, COL-020, COL-021
 */

test.describe("Collections - POST /api/v1/collections (validations)", () => {
  let createdIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await request.delete(`/api/v1/collections/${id}`).catch(() => { });
    }
    createdIds = [];
  });

  test("COL-015: adds the new collection id to the user's collectionOrder", async ({
    request,
  }) => {
    // GET /api/v1/auth/session only exposes { user: { id }, expires } —
    // confirmed empirically, collectionOrder is not included there.
    // PUT /api/v1/users/{id} (updateUserById.ts) returns the full updated
    // user record instead, which does include collectionOrder. Used here
    // purely as a read mechanism: username is resent unchanged.
    const sessionResponse = await request.get("/api/v1/auth/session");
    const { user } = await sessionResponse.json();

    const beforeResponse = await request.put(`/api/v1/users/${user.id}`, {
      data: { username: "qa-tester" },
    });
    const before = (await beforeResponse.json()).response;

    const createResponse = await request.post("/api/v1/collections", {
      data: { name: "Nueva Colección COL-015" },
    });
    const created = (await createResponse.json()).response;
    createdIds.push(created.id);

    const afterResponse = await request.put(`/api/v1/users/${user.id}`, {
      data: { username: "qa-tester" },
    });
    const after = (await afterResponse.json()).response;

    // Only checking inclusion, not exact length: other tests running in
    // parallel (Playwright workers) also create collections and mutate
    // this same array concurrently.
    expect(after.collectionOrder).toContain(created.id);
    expect(after.collectionOrder.length).toBeGreaterThan(
      before.collectionOrder.length
    );
  });

  test("COL-016 (replacement): rootOwnerId is inherited 3 levels deep", async ({
    request,
  }) => {
    const grandparent = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Grandparent COL-016" },
        })
      ).json()
    ).response;
    createdIds.push(grandparent.id);

    const parent = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Parent COL-016", parentId: grandparent.id },
        })
      ).json()
    ).response;
    createdIds.push(parent.id);

    const grandchild = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Grandchild COL-016", parentId: parent.id },
        })
      ).json()
    ).response;
    createdIds.push(grandchild.id);

    expect(grandchild.ownerId).toBe(grandparent.ownerId);
    expect(parent.ownerId).toBe(grandparent.ownerId);
  });

  test("COL-019: trims whitespace-only name to empty string [DEF-COL-001]", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "   " },
    });

    // Expected per spec: 400 "Error: Required [name]" (same root cause as
    // DEF-COL-001 — name lacks .min(1) after .trim()). Left as the expected
    // assertion on purpose; failing here confirms the defect is still present.
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body.response).toContain("Required");
  });

  test("COL-020 (DV): rejects a name exceeding 2048 characters", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "a".repeat(2049) },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.response).toContain("2048 characters");
    expect(body.response).toContain("[name]");
  });

  test("COL-020 (DI): accepts a name at the exact 2048-character limit", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "a".repeat(2048) },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    createdIds.push(body.response.id);
  });

  test("COL-021 (DV): rejects parentId sent as a string", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "Subcolección", parentId: "abc" },
    });

    expect(response.status()).toBe(400);

    // Spec expected "Invalid parentId." (the manual typeof check in
    // postCollection.ts). In practice, Zod's own schema validation
    // (parentId: z.number().optional()) rejects the wrong type first,
    // so that manual check is unreachable dead code. Not a defect —
    // the request is still correctly rejected with 400.
    const body = await response.json();
    expect(body.response).toContain("[parentId]");
  });
});