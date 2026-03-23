import type { PersonaProfile } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function requestPersonaProfile(personId: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/persona/${personId}`, {
    credentials: "include",
  });
}

export async function readPersonaProfileResponse(response: Response): Promise<PersonaProfile> {
  return (await response.json()) as PersonaProfile;
}

export async function requestPersonaAsk(personId: string, question: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/persona/${personId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    credentials: "include",
  });
}
