import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  desc,
  eq,
  getDb,
  inArray,
  isNull,
  resourceLinks,
  resources,
  sql,
} from "@open-sunsama/database";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  uuidSchema,
} from "@open-sunsama/utils";
import { jwtAuth, type AuthVariables } from "../middleware/auth.js";
import { expectedRevision } from "../validation/study-sessions.js";
import {
  getS3Object,
  uploadToS3,
  deleteFromS3,
  generateUniqueKey,
} from "../lib/s3.js";
import {
  isAllowedAttachmentType,
  MAX_ATTACHMENT_SIZE,
} from "../validation/uploads.js";
import {
  normalizeResourceUrl,
  notifyLearning,
  requireOwnedResource,
  validateLearningLinks,
} from "../services/learning.js";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", jwtAuth);
const id = z.object({ id: uuidSchema });
const target = z
  .object({
    subjectId: uuidSchema.optional(),
    assignmentId: uuidSchema.optional(),
    studySessionId: uuidSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).filter(Boolean).length === 1,
    "Choose one academic link"
  );
const create = z
  .object({
    type: z.enum(["youtube", "web"]),
    title: z.string().trim().min(1).max(500),
    url: z.string().max(2048),
    link: target.optional(),
  })
  .strict();
const update = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
const list = z.object({
  subjectId: uuidSchema.optional(),
  assignmentId: uuidSchema.optional(),
  studySessionId: uuidSchema.optional(),
});

router.get("/", zValidator("query", list), async (c) => {
  const userId = c.get("userId");
  const filters = c.req.valid("query");
  const db = getDb();
  await validateLearningLinks(db, userId, filters);
  const conditions = [
    eq(resources.userId, userId),
    isNull(resources.deletedAt),
  ];
  for (const key of ["subjectId", "assignmentId", "studySessionId"] as const) {
    if (filters[key])
      conditions.push(
        inArray(
          resources.id,
          db
            .select({ id: resourceLinks.resourceId })
            .from(resourceLinks)
            .where(
              and(
                eq(resourceLinks.userId, userId),
                eq(resourceLinks[key], filters[key]!)
              )
            )
        )
      );
  }
  const data = await db
    .select()
    .from(resources)
    .where(and(...conditions))
    .orderBy(desc(resources.createdAt))
    .limit(200);
  return c.json({ success: true, data });
});

router.post("/", zValidator("json", create), async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const db = getDb();
  if (input.link) await validateLearningLinks(db, userId, input.link);
  const normalized = normalizeResourceUrl(input.url, input.type);
  const result = await db.transaction(async (tx) => {
    const [resource] = await tx
      .insert(resources)
      .values({ userId, type: input.type, title: input.title, ...normalized })
      .returning();
    if (!resource) throw new Error("Resource creation failed");
    if (input.link)
      await tx
        .insert(resourceLinks)
        .values({ userId, resourceId: resource.id, ...input.link });
    return resource;
  });
  notifyLearning(userId, "resources");
  return c.json({ success: true, data: result }, 201);
});

router.post("/upload", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.parseBody();
  const file = body.file;
  if (
    !(file instanceof File) ||
    !isAllowedAttachmentType(file.type) ||
    file.size < 1 ||
    file.size > MAX_ATTACHMENT_SIZE
  ) {
    throw new ValidationError("Choose a supported file under 10 MB");
  }
  const linkJson = body.link;
  let link: z.infer<typeof target> | undefined;
  if (typeof linkJson === "string" && linkJson) {
    try {
      link = target.parse(JSON.parse(linkJson));
    } catch {
      throw new ValidationError("Invalid academic link");
    }
  }
  const db = getDb();
  if (link) await validateLearningLinks(db, userId, link);
  if (
    !process.env.AWS_S3_BUCKET_NAME ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    throw new ValidationError("File storage is not configured on this server");
  }
  const key = generateUniqueKey(
    userId,
    "resources",
    `${crypto.randomUUID()}-${file.name}`
  );
  await uploadToS3(key, Buffer.from(await file.arrayBuffer()), file.type);
  try {
    const resource = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(resources)
        .values({
          userId,
          type: "file",
          title: file.name,
          storageKey: key,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        })
        .returning();
      if (!row) throw new Error("Resource creation failed");
      if (link)
        await tx
          .insert(resourceLinks)
          .values({ userId, resourceId: row.id, ...link });
      return row;
    });
    notifyLearning(userId, "resources");
    return c.json({ success: true, data: resource }, 201);
  } catch (error) {
    await deleteFromS3(key).catch(() => undefined);
    throw error;
  }
});

router.get("/:id", zValidator("param", id), async (c) => {
  const data = await requireOwnedResource(
    getDb(),
    c.get("userId"),
    c.req.valid("param").id
  );
  return c.json({ success: true, data });
});

router.get("/:id/links", zValidator("param", id), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    resourceId = c.req.valid("param").id;
  await requireOwnedResource(db, userId, resourceId);
  const data = await db
    .select()
    .from(resourceLinks)
    .where(
      and(
        eq(resourceLinks.userId, userId),
        eq(resourceLinks.resourceId, resourceId)
      )
    );
  return c.json({ success: true, data });
});

router.post(
  "/:id/links",
  zValidator("param", id),
  zValidator("json", target),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      resourceId = c.req.valid("param").id,
      link = c.req.valid("json");
    await requireOwnedResource(db, userId, resourceId);
    await validateLearningLinks(db, userId, link);
    const [existing] = await db
      .select()
      .from(resourceLinks)
      .where(
        and(
          eq(resourceLinks.userId, userId),
          eq(resourceLinks.resourceId, resourceId),
          link.subjectId
            ? eq(resourceLinks.subjectId, link.subjectId)
            : link.assignmentId
              ? eq(resourceLinks.assignmentId, link.assignmentId)
              : eq(resourceLinks.studySessionId, link.studySessionId!)
        )
      )
      .limit(1);
    if (existing) return c.json({ success: true, data: existing });
    const [row] = await db
      .insert(resourceLinks)
      .values({ userId, resourceId, ...link })
      .returning();
    notifyLearning(userId, "resources");
    return c.json({ success: true, data: row }, 201);
  }
);

router.delete(
  "/:id/links/:linkId",
  zValidator("param", z.object({ id: uuidSchema, linkId: uuidSchema })),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      { id: resourceId, linkId } = c.req.valid("param");
    await requireOwnedResource(db, userId, resourceId);
    const [row] = await db
      .delete(resourceLinks)
      .where(
        and(
          eq(resourceLinks.id, linkId),
          eq(resourceLinks.resourceId, resourceId),
          eq(resourceLinks.userId, userId)
        )
      )
      .returning();
    if (!row) throw new NotFoundError("Resource link", linkId);
    notifyLearning(userId, "resources");
    return c.json({ success: true, data: row });
  }
);

router.get("/:id/file", zValidator("param", id), async (c) => {
  const resource = await requireOwnedResource(
    getDb(),
    c.get("userId"),
    c.req.valid("param").id
  );
  if (resource.type !== "file" || !resource.storageKey)
    throw new NotFoundError("File");
  const file = await getS3Object(resource.storageKey);
  if (!file) throw new NotFoundError("File");
  const safeName = (resource.filename ?? "study-resource").replace(
    /[\r\n"\\]/g,
    "_"
  );
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.contentLength),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

router.patch(
  "/:id",
  zValidator("param", id),
  zValidator("json", update),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      resourceId = c.req.valid("param").id;
    await requireOwnedResource(db, userId, resourceId);
    const input = c.req.valid("json"),
      revision = expectedRevision(c.req.header("If-Match"));
    const [row] = await db
      .update(resources)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.completed !== undefined
          ? { completedAt: input.completed ? new Date() : null }
          : {}),
        revision: sql`${resources.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(resources.id, resourceId),
          eq(resources.userId, userId),
          isNull(resources.deletedAt),
          eq(resources.revision, revision)
        )
      )
      .returning();
    if (!row)
      throw new ConflictError("Resource changed. Refresh and try again.");
    notifyLearning(userId, "resources");
    return c.json({ success: true, data: row });
  }
);

router.delete("/:id", zValidator("param", id), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    resourceId = c.req.valid("param").id;
  await requireOwnedResource(db, userId, resourceId);
  const revision = expectedRevision(c.req.header("If-Match"));
  const [row] = await db
    .update(resources)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      revision: sql`${resources.revision} + 1`,
    })
    .where(
      and(
        eq(resources.id, resourceId),
        eq(resources.userId, userId),
        isNull(resources.deletedAt),
        eq(resources.revision, revision)
      )
    )
    .returning();
  if (!row) throw new ConflictError("Resource changed. Refresh and try again.");
  notifyLearning(userId, "resources");
  return c.json({ success: true, data: row });
});

export { router as resourcesRouter };
