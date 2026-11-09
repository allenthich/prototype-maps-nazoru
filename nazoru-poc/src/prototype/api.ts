import type { Filters, Scope } from './catalog';
import { scopeQuery } from './search';

export function queryFor(scope: Scope, filters: Filters): URLSearchParams {
  const params = new URLSearchParams({ scope: scopeQuery(scope), category: filters.category });
  for (const preference of filters.preferences) params.append('pref', preference);
  return params;
}

export async function fetchStores<T>(params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/nagoya/map-lab/stores.json?${params}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? '読み込めませんでした。もう一度お試しください。');
  return data as T;
}

export const wasAborted = (error: unknown) => error instanceof Error && error.name === 'AbortError';
