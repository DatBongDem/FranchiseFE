const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem("franchise.token");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.",
      0,
    );
  }
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!response.ok) {
    if (response.status === 401 && path !== "/users/login") {
      sessionStorage.removeItem("franchise.token");
      window.dispatchEvent(new Event("session-expired"));
    }
    const error = data as { message?: string; error?: string } | undefined;
    throw new ApiError(
      typeof data === "string"
        ? data
        : error?.message ||
            error?.error ||
            `Yêu cầu thất bại (${response.status})`,
      response.status,
    );
  }
  return data as T;
}
// Backend currently returns both SQL PascalCase and DTO camelCase.
export function normalize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => normalize(item)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.charAt(0).toLowerCase() + key.slice(1),
        normalize(item),
      ]),
    ) as T;
  return value as T;
}
export function collection<T>(value: unknown, key?: string): T[] {
  const data = normalize<Record<string, unknown> | T[]>(value);
  if (Array.isArray(data)) return data;
  return key && Array.isArray(data?.[key]) ? (data[key] as T[]) : [];
}
