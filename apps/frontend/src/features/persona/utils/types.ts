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

export type MbtiProfile = {
  type: string;          // e.g. "INFJ"
  identity: "A" | "T";  // Assertive | Turbulent
  scores: {
    introverted: number;  // 0–100 (vs Extraverted)
    intuitive: number;    // 0–100 (vs Observant)
    feeling: number;      // 0–100 (vs Thinking)
    judging: number;      // 0–100 (vs Prospecting)
    turbulent: number;    // 0–100 (vs Assertive)
  };
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
  fit_vectors: FitVectors;
  sdg_alignment: SdgAlignment[];
  identity_shifts: IdentityShift[];
  email?: string;
  github_address?: string;
};

export type PersonaQAMessage = {
  role: "user" | "persona";
  content: string;
};
