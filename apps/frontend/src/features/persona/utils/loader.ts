import type { LoaderFunctionArgs } from "react-router-dom";

import { requestPersonaProfile, readPersonaProfileResponse } from "./api";
import type { PersonaLoaderData } from "../pages/persona-page";
import type { PersonaProfile } from "./types";

// Hardcoded from hupository/data/01_identity/ — used when backend is not yet available
const DEMO_PROFILE: PersonaProfile = {
  person_id: "demo",
  archetype: "reflective educator-builder",
  headline: "Educator-turned developer with a strong math teaching background",
  mbti: {
    type: "INFJ",
    identity: "T",
    scores: {
      introverted: 78,
      intuitive: 86,
      feeling: 62,
      judging: 79,
      turbulent: 72,
    },
  },
  one_liner:
    "A person who connects learning to life design, and transforms what they've learned into structures and systems for people.",
  top3_values: ["Life Design", "Growth & Learning", "Education & Sharing"],
  strengths: [
    "Structures learned content into forms others can use",
    "Organizes people and designs programs with operational skill",
    "Sustains deep learning on a single subject over the long term",
    "Reconstructs career direction into new domains with resilience",
    "Translates teaching experience into product and service problems",
    "Strong writing and documentation habits support learning and collaboration",
  ],
  watchouts: [
    "Running too many axes at once can lead to overload",
    "Wide interests can blur execution priorities",
  ],
  goals_vision: {
    lifetime_mission:
      "Hold the question of how to design a life — and help more people design their own lives better through technology and education.",
    current_decade_mission:
      "Become someone who directly builds education and technology. Grow Sejong Class as a solo founder, secure AI builder capabilities, and lay the foundation for the next decade.",
    long_term_vision:
      "As a Life Designer, combine technology and education so that more people can design their own lives with greater intention.",
    long_term_directions: [
      "Integrated education + technology service (Sejong Class expansion)",
      "Systems architect — design and automate at scale",
      "Community + platform — gather and connect people",
      "Life design content and service at wider reach",
    ],
  },
  fit_vectors: {
    learning_drive: 5,
    teaching_drive: 5,
    community_drive: 5,
    builder_drive: 4,
    scientific_curiosity: 5,
    entrepreneurship: 4,
    reflection_depth: 5,
  },
  sdg_alignment: [
    { sdg: 4, label: "Quality Education", resonance: "high" },
    { sdg: 8, label: "Decent Work and Economic Growth", resonance: "high" },
    { sdg: 10, label: "Reduced Inequalities", resonance: "medium" },
    { sdg: 17, label: "Partnerships for the Goals", resonance: "medium" },
  ],
  email: "lifedesigner88@gmail.com",
  github_address: "https://github.com/lifedesigner88",
  identity_shifts: [
    {
      period: "2008–2010",
      label: "Reboot after a dark period",
      note: "After bipolar disorder, dropping ROTC, and a suicide attempt — overcame social anxiety and re-engaged with people through the Noulga-ji community.",
    },
    {
      period: "2011",
      label: "Life Designer declaration",
      note: "Publicly declared the identity 'Life Designer' at a Carpe Diem vision event. A consistent north star for the next 15 years.",
    },
    {
      period: "2021",
      label: "Religion → science worldview shift",
      note: "Concluded 10 years of Daesoon Jinrihoe practice and restructured worldview around neuroscience, physics, and evolutionary theory.",
    },
    {
      period: "2023–2025",
      label: "Education operator → tech-based solo founder",
      note: "After bootcamp and Playdata experience, quit and founded Sejong Class. Converging toward building education through technology.",
    },
  ],
};

const DEMO_BACKEND_ID = "d31sf2";

export async function personaLoader({ params }: LoaderFunctionArgs): Promise<PersonaLoaderData> {
  const personId = params.personId ?? "";

  // "demo" route: try the real backend persona first; fall back to hardcoded data
  // so the Ask panel has a valid persona_id to post against.
  if (personId === "demo") {
    try {
      const response = await requestPersonaProfile(DEMO_BACKEND_ID);
      if (response.ok) {
        const profile = await readPersonaProfileResponse(response);
        return { profile };
      }
    } catch {
      // backend unreachable — fall through to hardcoded demo
    }
    return { profile: DEMO_PROFILE };
  }

  const response = await requestPersonaProfile(personId);
  if (!response.ok) {
    throw new Response("Persona not found", { status: 404 });
  }
  const profile = await readPersonaProfileResponse(response);
  return { profile };
}
