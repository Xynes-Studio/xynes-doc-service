import { registerAction } from './registry';
import { createDocumentHandler } from './handlers/createDocument';
import { readDocumentHandler } from './handlers/readDocument';

export function registerDocActions() {
  registerAction('docs.document.create', createDocumentHandler);
  registerAction('docs.document.read', readDocumentHandler);
}
