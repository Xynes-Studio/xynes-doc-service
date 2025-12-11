import { getActionHandler } from './registry';
import { ActionContext, DocActionKey } from './types';
import { UnknownActionError } from './errors';

export async function executeDocAction(
  actionKey: DocActionKey,
  payload: unknown,
  ctx: ActionContext,
) {
  const handler = getActionHandler(actionKey);
  if (!handler) {
    throw new UnknownActionError(actionKey);
  }
  return handler(payload, ctx);
}
