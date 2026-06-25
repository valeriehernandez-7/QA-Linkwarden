import { test, expect } from "../../index";
import { loginAs } from "../../helpers/auth";

/**
 * Módulo: Collections (COL)
 * Endpoint: POST /api/v1/collections
 * Referencia: Proyecto - Avance 1/3, casos COL-001 a COL-004
 *
 * Autenticación:
 *  - qa-tester (owner): vía storageState (fixture `request`, ya autenticado).
 *  - username0 / username1 (miembros): vía loginAs(), que devuelve tanto el
 *    context autenticado como el userId REAL obtenido dinámicamente desde
 *    GET /api/v1/auth/session. Nunca se hardcodean IDs de usuario, porque
 *    cada base de datos/ambiente puede asignarles un id distinto.
 */

test.describe("Collections - POST /api/v1/collections", () => {
  // Acumula los IDs de colecciones creadas en cada test para limpiarlas después.
  // Esto evita que la base de datos acumule colecciones "fantasma" entre
  // corridas sucesivas de la suite, sin depender de un docker compose down -v
  // antes de cada ejecución.
  let createdIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      // Se ignoran errores de limpieza (ej. si el test falló antes de crear
      // el recurso, o si ya fue borrado dentro del propio test).
      await request.delete(`/api/v1/collections/${id}`).catch(() => {});
    }
    createdIds = [];
  });

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
    createdIds.push(body.response.id);
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
    createdIds.push(body.response.id);
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
    createdIds.push(body.response.id);
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
    // No se crea ninguna colección en este caso (rechazada por validación),
    // por lo que no hay nada que agregar a createdIds.
  });

  test("COL-003 (DV): crea una subcolección con parentId válido", async ({
    request,
  }) => {
    // Arrange: crear la colección padre primero
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-003" },
    });
    const parent = (await parentResponse.json()).response;
    createdIds.push(parent.id);

    // Act
    const response = await request.post("/api/v1/collections", {
      data: { name: "Backend", parentId: parent.id },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.parentId).toBe(parent.id);
    expect(body.response.ownerId).toBe(parent.ownerId);
    createdIds.push(body.response.id);
    // NOTA: borrar primero el padre (createdIds en orden) cascadea y borra
    // la subcolección también (ver FK Collection_parentId_fkey ON DELETE CASCADE),
    // por lo que el delete individual de la subcolección en afterEach puede
    // fallar silenciosamente (ya no existe) — esto es esperado y inofensivo
    // gracias al .catch(() => {}) en el afterEach.
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
    // No se crea ninguna colección (rechazada), nada que limpiar.
  });

  test("COL-004 (DV): miembro con permisos completos crea subcolección y queda agregado como miembro", async ({
    request,
    baseURL,
  }) => {
    // Arrange: qa-tester (owner) crea la colección padre
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-004 DV" },
    });
    const parent = (await parentResponse.json()).response;
    createdIds.push(parent.id);

    // Resolver dinámicamente el userId real de username0 en ESTA base de datos
    const member = await loginAs(baseURL!, "username0", "username0");

    // qa-tester agrega a username0 (por su id real) como miembro con los 3 permisos
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

    // Act: username0 (miembro, no owner) crea una subcolección
    const response = await member.context.post("/api/v1/collections", {
      data: { name: "Subcategoría COL-004 DV", parentId: parent.id },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.response.parentId).toBe(parent.id);
    createdIds.push(body.response.id);

    // Verificar que username0 quedó agregado como miembro de la NUEVA
    // colección con los 3 permisos en true. Según postCollection.ts líneas
    // 111-123: cuando userId !== rootOwnerId, el código SIEMPRE agrega al
    // creador como miembro con canCreate/canUpdate/canDelete = true,
    // independientemente de los permisos que tenía en la colección padre.
    // No es "herencia" de permisos del padre, es una asignación automática.
    const newCollectionMembers = body.response.members ?? [];
    const username0AsMember = newCollectionMembers.find(
      (m: any) => m.userId === member.userId
    );
    expect(username0AsMember).toBeDefined();
    expect(username0AsMember.canCreate).toBe(true);
    expect(username0AsMember.canUpdate).toBe(true);
    expect(username0AsMember.canDelete).toBe(true);

    await member.context.dispose();
  });

  test("COL-004 (DI): miembro SIN canCreate no puede crear subcolección", async ({
    request,
    baseURL,
  }) => {
    // Arrange: qa-tester (owner) crea la colección padre
    const parentResponse = await request.post("/api/v1/collections", {
      data: { name: "Padre COL-004 DI" },
    });
    const parent = (await parentResponse.json()).response;
    createdIds.push(parent.id);

    // Resolver dinámicamente el userId real de username1 en ESTA base de datos
    const member = await loginAs(baseURL!, "username1", "username1");

    // qa-tester agrega a username1 como miembro SIN canCreate
    // (canUpdate/canDelete en true para confirmar que el código exige los
    // TRES permisos, no solo canCreate de forma aislada)
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

    // Act: username1 (miembro con permisos incompletos) intenta crear subcolección
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