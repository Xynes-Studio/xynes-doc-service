import { registerAction } from './registry';
import { createDocumentHandler } from './handlers/createDocument';
import { readDocumentHandler } from './handlers/readDocument';
import { updateDocumentHandler } from './handlers/updateDocument';
import { listDocumentsByWorkspaceHandler } from './handlers/listDocumentsByWorkspace';

export function registerDocActions() {
  registerAction('docs.document.create', createDocumentHandler);
  registerAction('docs.document.read', readDocumentHandler);
  registerAction('docs.document.update', updateDocumentHandler);
  registerAction('docs.document.listByWorkspace', listDocumentsByWorkspaceHandler);
}
