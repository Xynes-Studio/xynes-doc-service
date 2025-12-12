import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { documents } from '../src/infra/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Use process.env.DATABASE_URL
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

describe.skipIf(process.env.RUN_INTEGRATION_TESTS !== 'true')('Database Integration', () => {
  it('should connect to the database', async () => {
    const result = await client`SELECT 1 as res`;
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].res).toBe(1);
  });

  it('should insert and retrieve a document', async () => {
    const testDoc = {
      workspaceId: uuidv4(),
      type: 'page',
      title: 'Integration Test Document',
      content: { type: 'doc', content: [] },
      status: 'draft',
    };

    // Insert
    const [inserted] = await db.insert(documents).values(testDoc).returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toBeDefined();
    expect(inserted.title).toBe(testDoc.title);
    expect(inserted.workspaceId).toBe(testDoc.workspaceId);
    expect(inserted.type).toBe(testDoc.type);
    expect(inserted.status).toBe(testDoc.status);
    expect(inserted.createdAt).toBeDefined();
    expect(inserted.updatedAt).toBeDefined();

    // Retrieve
    const [retrieved] = await db.select().from(documents).where(eq(documents.id, inserted.id));

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(inserted.id);
    expect(retrieved.title).toBe(testDoc.title);

    // Cleanup
    await db.delete(documents).where(eq(documents.id, inserted.id));
  });
});
