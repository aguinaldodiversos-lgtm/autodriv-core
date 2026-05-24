import { env } from "@/lib/config/env";
import { getAuthToken } from "@/lib/auth/session";

export type ApiErrorCode = 401 | 403 | 404 | 500 | number;

export class ApiError extends Error {
  status: ApiErrorCode;
  details?: unknown;

  constructor(status: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: HeadersInit;
  cache?: RequestCache;
};

function friendlyMessage(status: number, fallback?: string) {
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para executar esta ação.";
  if (status === 404) return "O recurso solicitado não foi encontrado.";
  if (status >= 500) return "O servidor encontrou um erro. Tente novamente em instantes.";
  return fallback || "Não foi possível concluir a solicitação.";
}

function buildUrl(path: string) {
  const base = env.apiUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token !== undefined ? options.token : getAuthToken();
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: options.cache || "no-store"
    });
  } catch (err) {
    throw new ApiError(
      0,
      "Nao foi possivel conectar com a API. Verifique se o backend esta ativo e se CORS_ORIGIN libera este frontend.",
      err
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const backendMessage =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error)
        : undefined;
    throw new ApiError(response.status, friendlyMessage(response.status, backendMessage), data);
  }

  return data as T;
}
