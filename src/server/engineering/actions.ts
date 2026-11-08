import 'server-only';
import type { Catalog, WorkAction, WorkResult } from '../../legacy/contracts';
import { publicActionSchema } from '../../shared/public-schemas';
import { isWorkspaceToken } from '../../workspace/asset-transport';
import { engineeringPolicy, privateWorkspaceHeaders, requireWorkspaceOwner, type Principal, type WorkspaceOwnership } from './access';
import { toPublicWorkResult } from './public-result';

type ActionScope = {
  routeIds: ReadonlySet<string>;
  inputIds: ReadonlySet<string>;
  controls: readonly {
    id: string;
    visible: boolean;
    enabled: boolean;
    options: readonly { value: string; enabled: boolean }[];
  }[];
};

export class InvalidWorkspaceAction extends Error {
  readonly status = 400;

  constructor() {
    super('Invalid workspace action');
  }
}

function parseAction(value: unknown): WorkAction {
  try {
    return publicActionSchema.parse(value);
  } catch {
    throw new InvalidWorkspaceAction();
  }
}

export function parseWorkspaceOperation(value: unknown) {
  if (!value || typeof value !== 'object' || Reflect.ownKeys(value).length !== 4 ||
      !['operationId', 'operationSequence', 'expectedRevision', 'action'].every(key => Object.hasOwn(value, key))) {
    throw new InvalidWorkspaceAction();
  }
  const { operationId, operationSequence, expectedRevision, action: raw } = value as Record<string, unknown>;
  if (!isWorkspaceToken(operationId) ||
      typeof operationSequence !== 'number' || !Number.isSafeInteger(operationSequence) || operationSequence < 1 ||
      typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new InvalidWorkspaceAction();
  }

  const action = parseAction(raw);
  if ((action.type === 'input' && action.raw.length > 4096) || (action.type === 'search' && action.query.length > 1024)) {
    throw new InvalidWorkspaceAction();
  }
  return { operationId, operationSequence, expectedRevision, action };
}

export function requireActionScope(action: WorkAction, scope: ActionScope): void {
  switch (action.type) {
    case 'select-route':
      if (!scope.routeIds.has(action.routeId)) throw new InvalidWorkspaceAction();
      break;
    case 'select-option': {
      const control = scope.controls.find(item => item.id === action.controlId);
      if (!control?.visible || !control.enabled ||
          !control.options.some(option => option.enabled && option.value === action.value)) {
        throw new InvalidWorkspaceAction();
      }
      break;
    }
    case 'input':
      if (!scope.inputIds.has(action.fieldId)) throw new InvalidWorkspaceAction();
      break;
  }
}

export function parseWorkspaceAction(value: unknown, scope: ActionScope) {
  const operation = parseWorkspaceOperation(value);
  requireActionScope(operation.action, scope);
  return operation;
}

export async function workspaceResultResponse(principal: Principal, workspace: WorkspaceOwnership, result: WorkResult,
  checkAccess = engineeringPolicy.checkAccess, catalog?: Catalog) {
  await checkAccess(principal);
  requireWorkspaceOwner(principal, workspace);
  return Response.json(toPublicWorkResult(workspace.id, result, catalog), { headers: privateWorkspaceHeaders });
}
