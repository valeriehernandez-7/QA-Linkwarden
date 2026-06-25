import { test, expect } from "../../../index";
import { loginAs } from "../../../helpers/auth";

/**
 * Module: Collections (COL)
 * Endpoint: PUT /api/v1/collections/{id}
 * Covers: COL-007 to COL-011, COL-024, COL-025
 *
 * UpdateCollectionSchema requires `name` and `members` on every PUT
 * (confirmed in schemaValidation.ts), so most requests here resend the
 * collection's current name even when only updating an unrelated field.
 */

test.describe("Collections - PUT /api/v1/collections/{id}", () => {
  let createdIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      // Explicit short timeout: a corrupted collection tree (e.g. a
      // self-referencing parentId, see DEF-COL-002) can make a recursive
      // delete hang. Failing fast here keeps one bad test from stalling
      // the entire suite.
      await request
        .delete(`/api/v1/collections/${id}`, { timeout: 5000 })
        .catch(() => { });
    }
    createdIds = [];
  });

  test("COL-007 (DV): owner updates name and description", async ({
    request,
  }) => {
    const created = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-007" },
        })
      ).json()
    ).response;
    createdIds.push(created.id);

    const response = await request.put(`/api/v1/collections/${created.id}`, {
      data: {
        id: created.id,
        name: "Nuevo Nombre",
        description: "Desc actualizada",
        members: [],
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.name).toBe("Nuevo Nombre");
    expect(body.response.description).toBe("Desc actualizada");
  });

  test("COL-007 (DI): rejects an empty name [DEF-COL-003]", async ({
    request,
  }) => {
    const created = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-007 DI" },
        })
      ).json()
    ).response;
    createdIds.push(created.id);

    const response = await request.put(`/api/v1/collections/${created.id}`, {
      data: { id: created.id, name: "", members: [] },
    });

    // Expected per spec: 400 "Error: Required [name]". Left as the
    // expected assertion on purpose. Confirmed root cause: same issue as
    // DEF-COL-001, but in a different schema — UpdateCollectionSchema.name
    // is also z.string().trim().max(2048) with no .min(1). See DEF-COL-003
    // (section 6) — medium severity, same fix needed in a second schema.
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.response).toContain("[name]");
  });

  test("COL-008 (DV): owner updates color, icon and iconWeight", async ({
    request,
  }) => {
    const created = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-008" },
        })
      ).json()
    ).response;
    createdIds.push(created.id);

    const response = await request.put(`/api/v1/collections/${created.id}`, {
      data: {
        id: created.id,
        name: created.name,
        color: "#ff0000",
        icon: "heart",
        iconWeight: "light",
        members: [],
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.color).toBe("#ff0000");
    expect(body.response.icon).toBe("heart");
    expect(body.response.iconWeight).toBe("light");
  });

  test("COL-008 (DI): rejects a color exceeding 50 characters", async ({
    request,
  }) => {
    const created = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-008 DI" },
        })
      ).json()
    ).response;
    createdIds.push(created.id);

    const response = await request.put(`/api/v1/collections/${created.id}`, {
      data: {
        id: created.id,
        name: created.name,
        color: "#" + "a".repeat(51),
        members: [],
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.response).toContain("[color]");
  });

  test("COL-009 (DV): owner makes a private collection public", async ({
    request,
  }) => {
    const created = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-009" },
        })
      ).json()
    ).response;
    createdIds.push(created.id);

    const response = await request.put(`/api/v1/collections/${created.id}`, {
      data: { id: created.id, name: created.name, isPublic: true, members: [] },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.isPublic).toBe(true);
  });

  test("COL-009 (DI): rejects isPublic sent as a string", async ({
    request,
  }) => {
    const created = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-009 DI" },
        })
      ).json()
    ).response;
    createdIds.push(created.id);

    const response = await request.put(`/api/v1/collections/${created.id}`, {
      data: {
        id: created.id,
        name: created.name,
        isPublic: "true",
        members: [],
      },
    });

    expect(response.status()).toBe(400);
  });

  test("COL-010 (DV): owner moves a sub-collection to root", async ({
    request,
  }) => {
    const parent = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Parent COL-010" },
        })
      ).json()
    ).response;
    createdIds.push(parent.id);

    const child = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Child COL-010", parentId: parent.id },
        })
      ).json()
    ).response;
    createdIds.push(child.id);

    const response = await request.put(`/api/v1/collections/${child.id}`, {
      data: { id: child.id, name: child.name, parentId: "root", members: [] },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.parentId).toBeNull();
  });

  test("COL-010 (DI): rejects a non-existent parentId", async ({
    request,
  }) => {
    const collection = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-010 DI" },
        })
      ).json()
    ).response;
    createdIds.push(collection.id);

    const response = await request.put(
      `/api/v1/collections/${collection.id}`,
      {
        data: {
          id: collection.id,
          name: collection.name,
          parentId: 99999,
          members: [],
        },
      }
    );

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.response).toContain(
      "not authorized to create a sub-collection"
    );
  });

  test("COL-011 (DV): propagates members to child and grandchild collections", async ({
    request,
    baseURL,
  }) => {
    const parent = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Parent COL-011" },
        })
      ).json()
    ).response;
    createdIds.push(parent.id);

    const child = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Child COL-011", parentId: parent.id },
        })
      ).json()
    ).response;
    createdIds.push(child.id);

    const grandchild = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Grandchild COL-011", parentId: child.id },
        })
      ).json()
    ).response;
    createdIds.push(grandchild.id);

    const member0 = await loginAs(baseURL!, "username0", "username0");
    const member1 = await loginAs(baseURL!, "username1", "username1");

    const response = await request.put(`/api/v1/collections/${parent.id}`, {
      data: {
        id: parent.id,
        name: parent.name,
        members: [
          {
            userId: member0.userId,
            canCreate: true,
            canUpdate: false,
            canDelete: false,
          },
          {
            userId: member1.userId,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        ],
        propagateToSubcollections: true,
      },
    });

    expect(response.status()).toBe(200);

    const childCheck = await request.get(`/api/v1/collections/${child.id}`);
    const childMembers = (await childCheck.json()).response.members;
    expect(childMembers.some((m: any) => m.userId === member0.userId)).toBe(
      true
    );
    expect(childMembers.some((m: any) => m.userId === member1.userId)).toBe(
      true
    );

    const grandchildCheck = await request.get(
      `/api/v1/collections/${grandchild.id}`
    );
    const grandchildMembers = (await grandchildCheck.json()).response.members;
    expect(
      grandchildMembers.some((m: any) => m.userId === member0.userId)
    ).toBe(true);

    await member0.context.dispose();
    await member1.context.dispose();
  });

  test("COL-024 (DV): a member (not owner) cannot update the collection", async ({
    request,
    baseURL,
  }) => {
    const collection = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-024" },
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

    const response = await member.context.put(
      `/api/v1/collections/${collection.id}`,
      {
        data: {
          id: collection.id,
          name: "Nombre Modificado",
          members: [],
        },
      }
    );

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.response).toContain("not accessible");

    const verifyUnchanged = await request.get(
      `/api/v1/collections/${collection.id}`
    );
    expect((await verifyUnchanged.json()).response.name).toBe(
      "Original COL-024"
    );

    await member.context.dispose();
  });

  test("COL-025 (DV): rejects a collection set as its own parent [DEF-COL-002]", async ({
    request,
  }) => {
    const collection = (
      await (
        await request.post("/api/v1/collections", {
          data: { name: "Original COL-025" },
        })
      ).json()
    ).response;
    createdIds.push(collection.id);

    const response = await request.put(
      `/api/v1/collections/${collection.id}`,
      {
        data: {
          id: collection.id,
          name: collection.name,
          parentId: collection.id,
          members: [],
        },
      }
    );

    // Safety net FIRST: if the defect is still present (200 instead of
    // 403), undo the self-reference immediately, before any assertion
    // that could throw and skip this cleanup. This must run before
    // expect() — a failed expect() throws and aborts the rest of the
    // test, so a safety net placed after it would never execute.
    if (response.status() === 200) {
      await request.put(`/api/v1/collections/${collection.id}`, {
        data: {
          id: collection.id,
          name: collection.name,
          parentId: "root",
          members: [],
        },
      });
    }

    // Expected per spec: 403 "...not authorized to create a sub-collection...".
    // Left as the expected assertion on purpose. Confirmed root cause:
    // updateCollectionById.ts resolves findParentCollection using the SAME
    // id being updated. Its ownerId trivially matches userId (it owns
    // itself), and its current parentId (likely null) doesn't equal the
    // new parentId, so neither OR condition trips and the request is
    // wrongly accepted. DB confirmed: Collection.parentId ends up equal to
    // Collection.id. See DEF-COL-002 (section 6) — high severity, can
    // corrupt the collection tree and cause recursive deletes (and even
    // the dashboard UI, which also walks the collection tree) to hang.
    expect(response.status()).toBe(403);
  });
});