import type { RoomStateResponse, User } from "./types";

const rawApiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";
const API_BASE = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;

type HttpMethod = "GET" | "POST" | "PUT";

interface RequestOptions {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", token, body } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Unable to connect to backend at ${API_BASE}`);
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  register: (payload: { name: string; email: string; password: string }) =>
    requestJson<{ token: string; user: User; message: string }>("/api/auth/register", {
      method: "POST",
      body: payload,
    }),

  login: (payload: { email: string; password: string }) =>
    requestJson<{ token: string; user: User; message: string }>("/api/auth/login", {
      method: "POST",
      body: payload,
    }),

  getMe: (token: string) =>
    requestJson<{ user: User }>("/api/auth/me", {
      token,
    }),

  listRooms: () => requestJson<{ rooms: Array<{ id: string; name: string; ownerId: number; isPrivate: boolean }> }>("/api/rooms"),

  createRoom: (token: string, payload: { name: string; isPrivate: boolean }) =>
    requestJson<{ room: { id: string; name: string; ownerId: number; isPrivate: boolean }; message: string }>(
      "/api/rooms",
      {
        method: "POST",
        token,
        body: payload,
      }
    ),

  getRoomState: (roomId: string) =>
    requestJson<RoomStateResponse>(`/api/rooms/${roomId}/state`),

  joinRoom: (
    roomId: string,
    payload: { displayName: string; socketId: string },
    token?: string | null
  ) =>
    requestJson<{ message: string }>(`/api/rooms/${roomId}/join`, {
      method: "POST",
      token,
      body: payload,
    }),

  saveSnapshot: (
    roomId: string,
    payload: { elements: unknown[]; appState: Record<string, unknown> | null },
    token: string
  ) =>
    requestJson<{ message: string }>(`/api/rooms/${roomId}/snapshot`, {
      method: "PUT",
      token,
      body: payload,
    }),
};

export { API_BASE };
