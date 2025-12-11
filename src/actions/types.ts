export type DocActionKey = 'docs.document.create' | 'docs.document.read';

export interface ActionContext {
  workspaceId: string;
  userId?: string;
}

export type ActionHandler<Payload, Result> = (
  payload: Payload,
  ctx: ActionContext,
) => Promise<Result>;
