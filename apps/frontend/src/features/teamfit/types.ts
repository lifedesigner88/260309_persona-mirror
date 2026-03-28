import type { SessionUser } from "../auth/types";

export type TeamFitBucket = "similar" | "complementary" | "unexpected";
export type TeamFitCompletionStage = "step1" | "step2";
export type TeamFitExplorerPhase = "initial" | "followup";

export type TeamFitMbtiAxisValues = {
  mind: number;
  energy: number;
  nature: number;
  tactics: number;
  identity: number;
};

export type TeamFitInterviewTurnDraft = {
  question: string;
  answer: string;
};

export type TeamFitInterviewTurnSaveInput = TeamFitInterviewTurnDraft & {
  phase?: TeamFitExplorerPhase;
};

export type TeamFitInterviewTurn = TeamFitInterviewTurnDraft & {
  id: number;
  sequence_no: number;
  phase: TeamFitExplorerPhase;
  created_at: string;
};

export type TeamFitExplorerProfile = {
  user_id: number;
  problem_statement: string;
  mbti: string;
  mbti_axis_values: TeamFitMbtiAxisValues;
  sdg_tags: string[];
  narrative_markdown: string;
  history: TeamFitInterviewTurn[];
  can_request_followup: boolean;
  updated_at: string;
};

export type TeamFitExplorerMeResponse = {
  profile: TeamFitExplorerProfile | null;
  active_profile_count: number;
};

export type TeamFitInterviewQuestionRequest = {
  problem_statement: string;
  mbti?: string | null;
  mbti_axis_values: TeamFitMbtiAxisValues;
  sdg_tags: string[];
  narrative_markdown: string;
  history: TeamFitInterviewTurnDraft[];
};

export type TeamFitInterviewQuestionResponse = {
  phase: TeamFitExplorerPhase;
  sequence_no: number;
  question: string;
};

export type TeamFitFinalSaveRequest = Omit<TeamFitInterviewQuestionRequest, "history"> & {
  history: TeamFitInterviewTurnSaveInput[];
};

export type TeamFitFollowupAnswerRequest = {
  question: string;
  answer: string;
};

export type TeamFitProfile = {
  user_id: number;
  status?: string | null;
  completion_stage?: TeamFitCompletionStage | null;
  interests: string[];
  problem_focus: string[];
  domains: string[];
  preferred_role: string;
  tech_stack: string[];
  working_style: string;
  commitment_pace: string;
  mbti?: string | null;
  mbti_axis_values?: TeamFitMbtiAxisValues | null;
  impact_tags: string[];
  one_liner?: string | null;
  updated_at?: string | null;
};

export type TeamFitProfileResponse = TeamFitProfile | { profile?: TeamFitProfile | null };

export type TeamFitUpsertRequest = {
  completion_stage?: TeamFitCompletionStage;
  interests: string[];
  problem_focus: string[];
  domains: string[];
  preferred_role: string;
  tech_stack: string[];
  working_style: string;
  commitment_pace: string;
  mbti?: string | null;
  mbti_axis_values?: TeamFitMbtiAxisValues | null;
  impact_tags: string[];
  one_liner?: string | null;
};

export type TeamFitRecommendation = {
  user_id: number;
  name?: string | null;
  gender?: "M" | "F" | null;
  email?: string | null;
  github_address?: string | null;
  notion_url?: string | null;
  is_verified: boolean;
  preferred_role?: string | null;
  tech_stack: string[];
  working_style: string;
  commitment_pace?: string | null;
  domains: string[];
  impact_tags: string[];
  mbti?: string | null;
  mbti_axis_values?: TeamFitMbtiAxisValues | null;
  one_liner?: string | null;
  reason_codes: string[];
  reason_chips: string[];
  bucket: TeamFitBucket;
  similarity_score: number;
  structured_fit_score: number;
};

export type TeamFitRecommendationType = "safe_fit" | "complementary_fit" | "wildcard_fit";

export type TeamFitRecommendationReasonDetail = {
  problem_resonance: string;
  role_complementarity: string;
  work_style: string;
  value_alignment: string;
  conversation_potential: string;
};

export type TeamFitConversationPriorityRecommendation = {
  type: TeamFitRecommendationType;
  candidate_id: string;
  user_id: number;
  name: string;
  problem_statement: string;
  offered_role: string;
  sdgs: string[];
  mbti?: string | null;
  base_score: number;
  reason_summary: string;
  reason_detail: TeamFitRecommendationReasonDetail;
  first_question_to_ask: string;
  uncertainty_note: string;
  is_verified: boolean;
  email?: string | null;
  github_address?: string | null;
  notion_url?: string | null;
  history: TeamFitInterviewTurn[];
};

export type TeamFitFitCheckUpdate = {
  fit_score: number | null;
  fit_note?: string | null;
};

export type TeamFitFitCheckState = {
  target_user_id: number;
  fit_score: number | null;
  fit_note?: string | null;
  updated_at: string;
};

export type TeamFitRejectedCandidate = {
  candidate_id: string;
  name: string;
  reason: string;
  problem_statement: string;
  offered_role: string;
  sdgs: string[];
  mbti?: string | null;
  is_verified: boolean;
  email?: string | null;
  github_address?: string | null;
  notion_url?: string | null;
};

export type TeamFitRecommendationSystemNotes = {
  scoring_explanation: string;
  limits: string;
  next_improvement: string;
};

export type TeamFitMapPoint = {
  user_id: number;
  bucket: TeamFitBucket;
  name: string;
  x: number;
  y: number;
  is_verified: boolean;
};

export type TeamFitRecommendationsResponse = {
  requires_profile?: boolean;
  requires_approval?: boolean;
  similar?: TeamFitRecommendation[];
  complementary?: TeamFitRecommendation[];
  unexpected?: TeamFitRecommendation[];
  map_points?: TeamFitMapPoint[];
  active_profile_count?: number;
};

export type TeamFitConversationPriorityResponse = {
  requires_profile: boolean;
  requires_approval: boolean;
  active_profile_count: number;
  recommended_people: TeamFitConversationPriorityRecommendation[];
  rejected_or_low_signal_candidates: TeamFitRejectedCandidate[];
  system_notes: TeamFitRecommendationSystemNotes;
};

export type TeamFitCandidateDirectoryItem = {
  user_id: number;
  candidate_id: string;
  name: string;
  has_teamfit_profile: boolean;
  fit_score?: number | null;
  fit_note?: string | null;
  reason_summary: string;
  reason_detail?: TeamFitRecommendationReasonDetail | null;
  problem_statement: string;
  offered_role: string;
  sdgs: string[];
  mbti?: string | null;
  is_verified: boolean;
  email?: string | null;
  github_address?: string | null;
  notion_url?: string | null;
  history: TeamFitInterviewTurn[];
  created_at: string;
  profile_updated_at?: string | null;
  teamfit_score?: number | null;
  teamfit_rank?: number | null;
};

export type TeamFitCandidateDirectoryResponse = {
  candidates: TeamFitCandidateDirectoryItem[];
  total_count: number;
};

export type TeamFitSession = SessionUser | null;

export type TeamFitLoaderData = {
  sessionUser: TeamFitSession;
};
