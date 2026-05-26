import { getAuthToken } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { ApiError } from "./client";
import type { VehicleImage } from "@/types/veiculo";

function buildUrl(path: string) {
  const base = env.apiUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function friendlyUploadMessage(status: number, fallback?: string) {
  if (status === 401) return "Sua sessao expirou. Faca login novamente.";
  if (status === 403) return "Voce nao tem permissao para enviar fotos deste veiculo.";
  if (status === 404) return "Veiculo nao encontrado para receber fotos.";
  if (status === 413) return "Imagem muito grande. Envie uma foto menor.";
  if (status >= 500) return "O servidor encontrou um erro ao enviar a foto.";
  return fallback || "Nao foi possivel enviar a foto.";
}

export async function uploadVehicleImage(vehicleId: number, file: File) {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("image", file);

  let response: Response;
  try {
    response = await fetch(buildUrl(`/api/images/${vehicleId}`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      cache: "no-store"
    });
  } catch (err) {
    throw new ApiError(0, "Nao foi possivel conectar com a API para enviar a foto.", err);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const backendMessage =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error)
        : undefined;
    throw new ApiError(response.status, friendlyUploadMessage(response.status, backendMessage), data);
  }

  return data as VehicleImage;
}
