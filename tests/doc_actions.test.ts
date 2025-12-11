import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { registerDocActions } from "../src/actions/register";
import { executeDocAction } from "../src/actions/execute";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/infra/db";
import { documents } from "../src/infra/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../src/actions/errors";

describe("Doc Actions Integration", () => {
  beforeAll(() => {
    registerDocActions();
  });

  const workspaceId = uuidv4();
  const userId = uuidv4(); 
  const createdDocIds: string[] = [];

  afterAll(async () => {
    // Cleanup
    if (createdDocIds.length > 0) {
      for (const id of createdDocIds) {
          await db.delete(documents).where(eq(documents.id, id));
      }
    }
  });

  it("should create a document", async () => {
    const payload = {
        title: "Test Document",
        type: "page",
        content: { foo: "bar" },
        status: "draft"
    };
    const ctx = { workspaceId, userId };
    
    const doc: any = await executeDocAction("docs.document.create", payload, ctx);
    
    expect(doc).toBeDefined();
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe(payload.title);
    expect(doc.workspaceId).toBe(workspaceId);
    expect(doc.status).toBe("draft");
    
    createdDocIds.push(doc.id);
  });
  
  it("should read a document", async () => {
    // Create first
    const payload = { title: "Read Me", type: "note", content: {}, status: "published" };
    const ctx = { workspaceId, userId };
    const created: any = await executeDocAction("docs.document.create", payload, ctx);
    createdDocIds.push(created.id);
    
    // Read
    const read: any = await executeDocAction("docs.document.read", { id: created.id }, ctx);
    expect(read.id).toBe(created.id);
    expect(read.title).toBe(payload.title);
    expect(read.status).toBe(payload.status);
  });

  it("should throw NotFoundError for wrong workspace", async () => {
    // Create in workspace 1
    const p1 = { title: "Secret", type: "page", content: {} };
    const ctx1 = { workspaceId, userId };
    const created: any = await executeDocAction("docs.document.create", p1, ctx1);
    createdDocIds.push(created.id);

    // Try read in workspace 2
    const ctx2 = { workspaceId: uuidv4(), userId }; // New workspace
    
    try {
       await executeDocAction("docs.document.read", { id: created.id }, ctx2);
       throw new Error("Should have thrown");
    } catch (err: any) {
        expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  it("should throw NotFoundError for non-existent id", async () => {
    const ctx = { workspaceId, userId };
      try {
          await executeDocAction("docs.document.read", { id: uuidv4() }, ctx);
          throw new Error("Should have thrown");
      } catch (err: any) {
          expect(err).toBeInstanceOf(NotFoundError);
      }
  });
});
