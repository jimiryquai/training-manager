import type { dataView } from '@nkzw/fate/server';

type AnyDataView = { fields: Record<string, unknown> };

export function generateSelectPaths(view: AnyDataView, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [field, config] of Object.entries(view.fields)) {
    const path = prefix ? `${prefix}.${field}` : field;
    if (config && typeof config === 'object' && 'fields' in (config as object)) {
      paths.push(...generateSelectPaths(config as AnyDataView, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

interface ConnectionResult<T> {
  items: Array<{ cursor: string; node: T }>;
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

export function unwrapConnection<T>(connection: ConnectionResult<T> | undefined): T[] {
  if (!connection || !('items' in connection)) {
    return connection as unknown as T[];
  }
  return connection.items.map((item) => item.node);
}

export function unwrapConnectionsInPlace<T extends Record<string, unknown>>(
  obj: T,
  listFields: string[]
): T {
  for (const field of listFields) {
    if (field in obj && obj[field] && typeof obj[field] === 'object') {
      const value = obj[field] as ConnectionResult<unknown>;
      if ('items' in value) {
        (obj as Record<string, unknown>)[field] = unwrapConnection(value);
      }
    }
  }
  return obj;
}
