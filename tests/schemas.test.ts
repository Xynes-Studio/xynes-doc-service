import { describe, it, expect } from 'bun:test';
import {
  createDocumentPayloadSchema,
  readDocumentPayloadSchema,
  updateDocumentPayloadSchema,
  listDocumentsPayloadSchema,
} from '../src/actions/schemas';

describe('createDocumentPayloadSchema', () => {
  it('should accept payload without type and use default "doc"', () => {
    const payload = {
      title: 'Hello from smoke test',
      content: { type: 'doc', blocks: [] },
    };

    const result = createDocumentPayloadSchema.parse(payload);

    expect(result.type).toBe('doc');
    expect(result.title).toBe('Hello from smoke test');
    expect(result.content).toEqual({ type: 'doc', blocks: [] });
    expect(result.status).toBe('draft');
  });

  it('should accept payload with explicit type', () => {
    const payload = {
      title: 'Custom Type Doc',
      type: 'note',
      content: {},
    };

    const result = createDocumentPayloadSchema.parse(payload);

    expect(result.type).toBe('note');
  });

  it('should use default content {} when not provided', () => {
    const payload = {}; // No title, type, or content

    const result = createDocumentPayloadSchema.parse(payload);

    expect(result.type).toBe('doc');
    expect(result.content).toEqual({});
    expect(result.status).toBe('draft');
  });

  it('should accept array content', () => {
    const payload = {
      content: [{ type: 'text', value: 'hello' }],
    };

    const result = createDocumentPayloadSchema.parse(payload);

    // z.any() accepts any value
    expect(result.content).toEqual([{ type: 'text', value: 'hello' }]);
  });
});

describe('readDocumentPayloadSchema', () => {
  it('should accept valid UUID id', () => {
    const payload = { id: '550e8400-e29b-41d4-a716-446655440000' };

    const result = readDocumentPayloadSchema.parse(payload);

    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should reject invalid UUID id', () => {
    const payload = { id: 'not-a-uuid' };

    expect(() => readDocumentPayloadSchema.parse(payload)).toThrow();
  });

  it('should reject missing id', () => {
    const payload = {};

    expect(() => readDocumentPayloadSchema.parse(payload)).toThrow();
  });
});

describe('updateDocumentPayloadSchema', () => {
  it('should accept update with title only', () => {
    const payload = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'New Title',
    };

    const result = updateDocumentPayloadSchema.parse(payload);

    expect(result.id).toBe(payload.id);
    expect(result.title).toBe('New Title');
    expect(result.content).toBeUndefined();
  });

  it('should accept update with content only', () => {
    const payload = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      content: { foo: 'bar' },
    };

    const result = updateDocumentPayloadSchema.parse(payload);

    expect(result.content).toEqual({ foo: 'bar' });
  });

  it('should allow null title to clear it', () => {
    const payload = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: null,
    };

    const result = updateDocumentPayloadSchema.parse(payload);

    expect(result.title).toBeNull();
  });
});

describe('listDocumentsPayloadSchema', () => {
  it('should accept empty payload with defaults', () => {
    const payload = {};

    const result = listDocumentsPayloadSchema.parse(payload);

    // defaults are applied by the schema
    expect(result.limit).toBeUndefined(); // optional, but default in schema
    expect(result.offset).toBeUndefined();
  });

  it('should accept custom limit and offset', () => {
    const payload = { limit: 50, offset: 10 };

    const result = listDocumentsPayloadSchema.parse(payload);

    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it('should reject negative limit', () => {
    const payload = { limit: -1 };

    expect(() => listDocumentsPayloadSchema.parse(payload)).toThrow();
  });

  it('should reject negative offset', () => {
    const payload = { offset: -1 };

    expect(() => listDocumentsPayloadSchema.parse(payload)).toThrow();
  });
});
