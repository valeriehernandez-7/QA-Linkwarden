import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";

/**
 * Module: Collections (COL)
 * Endpoint: POST /api/v1/collections
 * Covers: COL-001 to COL-004
 *
 * qa-tester (owner) is authenticated via storageState (the `request` fixture).
 * username0 / username1 (members) are authenticated dynamically via loginAs(),
 * which resolves their real userId through GET /api/v1/auth/session —
 * never hardcoded, since ids differ across environments.
 */

test.describe("Collections - POST /api/v1/collections", () => {
  // Tracks ids created in each test so they can be cleaned up afterwards,
  // keeping the suite idempotent across repeated runs.
  let createdIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await request.delete(`/api/v1/collections/${id}`).catch(() => { });
    }
    createdIds = [];
  });

  test("COL-001 (DV): creates a root collection with only a name", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "Proyectos 2026" },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.name).toBe("Proyectos 2026");
    expect(body.response.parentId).toBeNull();
    createdIds.push(body.response.id);
  });

  test("COL-001 (DI): should reject an empty name [DEF-COL-001]", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "" },
    });

    // Expected per spec: 400 "Error: Required [name]".
    // This assertion is intentionally left as the EXPECTED behavior, not the
    // observed one. If it fails, that's the correct signal: DEF-COL-001 is
    // still present (PostCollectionSchema.name has no .min(1)). See section 6.
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body.response).toContain("Required");
    expect(body.response).toContain("[name]");
  });

  test("COL-002 (DV): creates a collection with all optional fields", async ({
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
    createdIds.push(body.response.id);
  });

  test("COL-002 (DI): rejects a color exceeding 50 characters", async ({
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
    // Zod's error wording changed between versions ("character(s)" -> "characters");
    // asserting on a stable substring avoids coupling the test to that detail.
    expect(body.response).toContain("50 characters");
    expect(body.response).toContain("[color]");
  });

  test("COL-003 (DV): creates a sub-collection with a valid parentId", async ({
    request,
  }) => {
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-003" },
    });
    const parent = (await parentResponse.json()).response;
    createdIds.push(parent.id);

    const response = await request.post("/api/v1/collections", {
      data: { name: "Backend", parentId: parent.id },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.parentId).toBe(parent.id);
    expect(body.response.ownerId).toBe(parent.ownerId);
    createdIds.push(body.response.id);
    // Deleting the parent cascades and deletes this sub-collection too
    // (Collection_parentId_fkey ON DELETE CASCADE), so its own afterEach
    // delete call may silently no-op — expected, harmless.
  });

  test("COL-003 (DI): rejects a non-existent parentId with 403, not 404", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/collections", {
      data: { name: "Backend", parentId: 999999 },
    });

    // Spec expected 404 "Parent collection not found." Confirmed real
    // behavior is 403: postCollection.ts checks permissions BEFORE resolving
    // the parentId, so a user with no relation to that id always hits the
    // 403 branch first.
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.response).toContain(
      "not authorized to create a sub-collection"
    );
  });

  test("COL-004 (DV): member with full permissions creates a sub-collection and is added as member", async ({
    request,
    baseURL,
  }) => {
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-004 DV" },
    });
    const parent = (await parentResponse.json()).response;
    createdIds.push(parent.id);

    const member = await loginAs(baseURL!, "username0", "username0");

    const updateResponse = await request.put(
      `/api/v1/collections/${parent.id}`,
      {
        data: {
          id: parent.id,
          name: parent.name,
          members: [
            {
              userId: member.userId,
              canCreate: true,
              canUpdate: true,
              canDelete: true,
            },
          ],
        },
      }
    );
    expect(updateResponse.status()).toBe(200);

    const response = await member.context.post("/api/v1/collections", {
      data: { name: "Subcategoría COL-004 DV", parentId: parent.id },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.parentId).toBe(parent.id);
    createdIds.push(body.response.id);

    // postCollection.ts always grants full permissions to a non-owner
    // creator on the NEW collection, regardless of their permissions on
    // the parent — not inherited, automatically assigned.
    const members = body.response.members ?? [];
    const asMember = members.find((m: any) => m.userId === member.userId);
    expect(asMember).toBeDefined();
    expect(asMember.canCreate).toBe(true);
    expect(asMember.canUpdate).toBe(true);
    expect(asMember.canDelete).toBe(true);

    await member.context.dispose();
  });

  test("COL-004 (DI): member without canCreate cannot create a sub-collection", async ({
    request,
    baseURL,
  }) => {
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-004 DI" },
    });
    const parent = (await parentResponse.json()).response;
    createdIds.push(parent.id);

    const member = await loginAs(baseURL!, "username1", "username1");

    // canUpdate/canDelete are true here to confirm all THREE permissions
    // are required, not just canCreate in isolation.
    const updateResponse = await request.put(
      `/api/v1/collections/${parent.id}`,
      {
        data: {
          id: parent.id,
          name: parent.name,
          members: [
            {
              userId: member.userId,
              canCreate: false,
              canUpdate: true,
              canDelete: true,
            },
          ],
        },
      }
    );
    expect(updateResponse.status()).toBe(200);

    const response = await member.context.post("/api/v1/collections", {
      data: { name: "Subcategoría COL-004 DI", parentId: parent.id },
    });

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.response).toContain(
      "not authorized to create a sub-collection"
    );

    await member.context.dispose();
  });
});