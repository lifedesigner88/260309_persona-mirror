import type {
  PersonaAskResponse,
  PersonaBilingualResponse,
  PersonaChatHistoryResponse,
  PersonaChatResetResponse
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function requestPersonaProfile(personId: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/persona/${personId}`, {
    credentials: "include",
  });
}

export async function readPersonaBilingualResponse(response: Response): Promise<PersonaBilingualResponse> {
  return (await response.json()) as PersonaBilingualResponse;
}

export async function requestPersonaAsk(personId: string, question: string, lang = "en"): Promise<Response> {
  return fetch(`${API_BASE_URL}/persona/${personId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, lang }),
    credentials: "include",
  });
}

export async function readPersonaAskResponse(response: Response): Promise<PersonaAskResponse> {
  return (await response.json()) as PersonaAskResponse;
}

export async function requestPersonaChatHistory(personId: string, lang = "en"): Promise<Response> {
  const params = new URLSearchParams({ lang });
  return fetch(`${API_BASE_URL}/persona/${personId}/chat?${params}`, {
    credentials: "include",
  });
}

export async function readPersonaChatHistoryResponse(
  response: Response
): Promise<PersonaChatHistoryResponse> {
  return (await response.json()) as PersonaChatHistoryResponse;
}

export async function requestPersonaChatReset(personId: string, lang = "en"): Promise<Response> {
  const params = new URLSearchParams({ lang });
  return fetch(`${API_BASE_URL}/persona/${personId}/chat/reset?${params}`, {
    method: "POST",
    credentials: "include",
  });
}

export async function readPersonaChatResetResponse(
  response: Response
): Promise<PersonaChatResetResponse> {
  return (await response.json()) as PersonaChatResetResponse;
}
