export type FitVectors = {
  learning_drive?: number;
  teaching_drive?: number;
  community_drive?: number;
  builder_drive?: number;
  scientific_curiosity?: number;
  entrepreneurship?: number;
  reflection_depth?: number;
};

export type SdgAlignment = {
  sdg: number;
  label: string;
  resonance: "high" | "medium" | "low";
};

export type IdentityShift = {
  period: string;
  label: string;
  note: string;
};

export type GoalsVision = {
  lifetime_mission: string;
  current_decade_mission: string;
  long_term_vision: string;
  long_term_directions: string[];
};

export type TeamUpProfile = {
  pitch: string;
  availability: string;
  target_domains: string[];
  what_i_bring: string[];
  looking_for: string[];
};

export type MbtiProfile = {
  type: string; // e.g. "INFJ"
  identity: "A" | "T"; // Assertive | Turbulent
  scores: {
    introverted: number; // 0–100 (vs Extraverted)
    intuitive: number; // 0–100 (vs Observant)
    feeling: number; // 0–100 (vs Thinking)
    judging: number; // 0–100 (vs Prospecting)
    turbulent: number; // 0–100 (vs Assertive)
  };
};

export type TechStackItem = {
  name: string;
  category: string;
  icon_url: string;
};

export type PersonaProfile = {
  person_id: string;
  title?: string;
  archetype: string;
  headline: string;
  one_liner: string;
  mbti: MbtiProfile;
  top3_values: string[];
  strengths: string[];
  watchouts: string[];
  goals_vision: GoalsVision;
  team_up?: TeamUpProfile;
  fit_vectors: FitVectors;
  sdg_alignment: SdgAlignment[];
  identity_shifts: IdentityShift[];
  tech_stack?: TechStackItem[];
};

export type PersonaQAMessage = {
  role: "user" | "persona";
  content: string;
};

export type PersonaBilingualResponse = {
  persona_id: string;
  title: string;
  data_eng: PersonaProfile;
  data_kor: PersonaProfile | null;
  email: string | null;
  github_address: string | null;
  notion_url: string | null;
};
