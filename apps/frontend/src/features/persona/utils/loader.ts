import type { LoaderFunctionArgs } from "react-router-dom";

import { requestPersonaProfile, readPersonaBilingualResponse } from "./api";
import type { PersonaLoaderData } from "../pages/persona-page";

async function loadPersonaData(personId: string): Promise<PersonaLoaderData> {
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
    notionUrl: data.notion_url
  };
}

export async function personaLoader({ params }: LoaderFunctionArgs): Promise<PersonaLoaderData> {
  return loadPersonaData(params.personId ?? "");
}

export async function sejongPersonaLoader(): Promise<PersonaLoaderData> {
  return loadPersonaData("sejong");
}
