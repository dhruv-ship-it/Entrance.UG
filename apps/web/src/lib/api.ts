export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({ message: 'Unable to complete the request.' }));
  if (!response.ok) throw new ApiError(response.status, body.message ?? 'Unable to complete the request.');
  return body as T;
};

