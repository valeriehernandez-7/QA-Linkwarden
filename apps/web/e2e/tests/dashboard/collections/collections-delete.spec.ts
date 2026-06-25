import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";

/**
 * Module: Collections (COL)
 * Endpoint: DELETE /api/v1/collections/{id}
 * Covers: COL-012, COL-013, COL-014
 *
 * COL-014 (DI) replacement: the original case required simulating a
 * database disconnection mid-transaction, which isn't practically
 * achievable from an API-level Playwright test. Replaced with a
 * verifiable equivalent: confirming the cascading delete stays scoped
 * to its own collection tree and doesn't affect another user's data.
 */

test.describe("Collections - DELETE /api/v1/collections/{id}", () => {
  let createdIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await request
        .delete(`/api/v1/collections/${id}`, { timeout: 5000 })
        .catch(() => { });
    }
    createdIds = [];
  });

  test("COL-012 (DV): a member leaves a shared collection without deleting it", async ({
    request,
    baseURL,
  }) => {
    const collection = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Compartida COL-012" },
        })
      ).json()
    ).response;
    createdIds.push(collection.id);

    const member = await loginAs(baseURL!, "username0", "username0");

    await request.put(`/api/v1/collections/${collection.id}`, {
      data: {
        id: collection.id,
        name: collection.name,
        members: [
          {
            userId: member.userId,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        ],
      },
    });

    const response = await member.context.delete(
      `/api/v1/collections/${collection.id}`
    );
    expect(response.status()).toBe(200);

    // The collection itself must still exist — the member only left it.
    const stillExists = await request.get(
      `/api/v1/collections/${collection.id}`
    );
    expect((await stillExists.json()).response).not.toBeNull();

    await member.context.dispose();
  });

  test("COL-012 (DI): rejects deleting a non-existent collection", async ({
    request,
  }) => {
    const response = await request.delete("/api/v1/collections/999999999");
    expect(response.status()).toBe(401);

    // "Please choose a valid collection." only fires when collectionId is
    // falsy (0/undefined/NaN). A valid but non-existent numeric id falls
    // through to getPermission returning nothing, landing on the second
    // guard instead. Clarification applied to avance 1 spec for COL-012.
    const body = await response.json();
    expect(body.response).toContain("not accessible");
  });

  test("COL-013 (DV): owner permanently deletes a leaf collection", async ({
    request,
  }) => {
    const collection = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Hoja COL-013" },
        })
      ).json()
    ).response;

    const response = await request.delete(
      `/api/v1/collections/${collection.id}`
    );
    expect(response.status()).toBe(200);

    const verifyGone = await request.get(
      `/api/v1/collections/${collection.id}`
    );
    expect((await verifyGone.json()).response).toBeNull();
  });

  test("COL-013 (DI): a user with no relation to the collection cannot delete it", async ({
    request,
    baseURL,
  }) => {
    // Clarification applied to the original spec (avance 1, COL-013): the
    // 401 applies to a user with NO relation at all to the collection
    // (neither owner nor member) — not to any member in general. A real
    // member (users_and_collections row) gets 200 via the "leave
    // collection" branch instead (see COL-012). Confirmed in
    // deleteCollectionById.ts: the 401 branch only triggers when
    // memberHasAccess is false.
    const collection = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Sin relación COL-013" },
        })
      ).json()
    ).response;
    createdIds.push(collection.id);

    const unrelatedUser = await loginAs(baseURL!, "username2", "username2");

    const response = await unrelatedUser.context.delete(
      `/api/v1/collections/${collection.id}`
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.response).toContain("not accessible");

    await unrelatedUser.context.dispose();
  });

  test("COL-014 (DV): deletes a parent collection and all its descendants in cascade", async ({
    request,
  }) => {
    const parent = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Parent COL-014" },
        })
      ).json()
    ).response;

    const childA = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Child A COL-014", parentId: parent.id },
        })
      ).json()
    ).response;

    const childB = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Child B COL-014", parentId: parent.id },
        })
      ).json()
    ).response;

    const grandchild = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Grandchild COL-014", parentId: childA.id },
        })
      ).json()
    ).response;

    const response = await request.delete(
      `/api/v1/collections/${parent.id}`
    );
    expect(response.status()).toBe(200);

    for (const id of [parent.id, childA.id, childB.id, grandchild.id]) {
      const check = await request.get(`/api/v1/collections/${id}`);
      expect((await check.json()).response).toBeNull();
    }
  });

  test("COL-014 (replacement): cascading delete doesn't affect another user's collections", async ({
    request,
    baseURL,
  }) => {
    const parent = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Parent COL-014b" },
        })
      ).json()
    ).response;

    const child = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Child COL-014b", parentId: parent.id },
        })
      ).json()
    ).response;

    const otherUser = await loginAs(baseURL!, "username0", "username0");
    const unrelated = (
      await (
        await otherUser.context.post("/api/v1/collections", {
          data: { name: "Unrelated COL-014b" },
        })
      ).json()
    ).response;
    createdIds.push(unrelated.id);

    const response = await request.delete(`/api/v1/collections/${parent.id}`);
    expect(response.status()).toBe(200);

    const stillExists = await otherUser.context.get(
      `/api/v1/collections/${unrelated.id}`
    );
    expect((await stillExists.json()).response).not.toBeNull();

    // parent.id and child.id are intentionally not pushed to createdIds:
    // the cascading delete above should have already removed both.
    await otherUser.context.dispose();
  });
});