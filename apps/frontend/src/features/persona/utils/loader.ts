import type { LoaderFunctionArgs } from "react-router-dom";

import { requestPersonaProfile, readPersonaBilingualResponse } from "./api";
import type { PersonaLoaderData } from "../pages/persona-page";

export async function personaLoader({ params }: LoaderFunctionArgs): Promise<PersonaLoaderData> {
  const personId = params.personId ?? "";
  const response = await requestPersonaProfile(personId);
  if (!response.ok) {
    throw new Response("Persona not found", { status: 404 });
  }
  const data = await readPersonaBilingualResponse(response);
  return {
    personaId: data.persona_id,
    title: data.title,
    dataEng: { ...data.data_eng, person_id: data.persona_id },
    dataKor: data.data_kor ? { ...data.data_kor, person_id: data.persona_id } : null,
    email: data.email,
    githubAddress: data.github_address,
    notionUrl: data.notion_url
  };
}
