import { DocActionKey, ActionHandler } from './types';

// Using a generic record type to holding any handlers
const registry: Record<string, ActionHandler<any, any>> = {};

export function registerAction<Payload, Result>(
  key: DocActionKey,
  handler: ActionHandler<Payload, Result>,
) {
  registry[key] = handler;
}

export function getActionHandler(key: DocActionKey) {
  return registry[key];
}
