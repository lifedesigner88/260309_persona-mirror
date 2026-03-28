from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


CompletionStage = Literal["step1", "step2"]


class TeamfitProfileUpsertRequest(BaseModel):
    completion_stage: CompletionStage = "step1"
    preferred_role: str
    working_style: str
    commitment_pace: str
    interests: list[str]
    problem_focus: list[str]
    domains: list[str]
    tech_stack: list[str]
    impact_tags: list[str] = []
    mbti: str | None = None
    mbti_axis_values: dict[str, int] | None = None
    one_liner: str | None = None


class TeamfitProfileResponse(BaseModel):
    user_id: int
    status: str
    completion_stage: CompletionStage
    preferred_role: str
    working_style: str
    commitment_pace: str
    interests: list[str]
    problem_focus: list[str]
    domains: list[str]
    tech_stack: list[str]
    impact_tags: list[str]
    mbti: str | None = None
    mbti_axis_values: dict[str, int] | None = None
    one_liner: str | None = None
    updated_at: datetime


class TeamfitMeResponse(BaseModel):
    profile: TeamfitProfileResponse | None
    active_profile_count: int


ExplorerPhase = Literal["initial", "followup"]


class TeamfitInterviewTurnInput(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1, max_length=2000)


class TeamfitInterviewTurnSaveInput(TeamfitInterviewTurnInput):
    phase: ExplorerPhase | None = None


class TeamfitInterviewTurnResponse(BaseModel):
    id: int
    sequence_no: int
    phase: ExplorerPhase
    question: str
    answer: str
    created_at: datetime


class TeamfitInterviewQuestionRequest(BaseModel):
    problem_statement: str = Field(..., min_length=1, max_length=80)
    mbti: str | None = Field(default=None, max_length=8)
    mbti_axis_values: dict[str, int]
    sdg_tags: list[str]
    narrative_markdown: str = Field(..., min_length=1, max_length=800)
    history: list[TeamfitInterviewTurnInput] = Field(default_factory=list)


class TeamfitInterviewQuestionResponse(BaseModel):
    phase: ExplorerPhase
    sequence_no: int
    question: str


class TeamfitExplorerProfileSaveRequest(BaseModel):
    problem_statement: str = Field(..., min_length=1, max_length=80)
    mbti: str | None = Field(default=None, max_length=8)
    mbti_axis_values: dict[str, int]
    sdg_tags: list[str]
    narrative_markdown: str = Field(..., min_length=1, max_length=800)
    history: list[TeamfitInterviewTurnSaveInput]


class TeamfitFollowupAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1, max_length=2000)


class TeamfitExplorerProfileResponse(BaseModel):
    user_id: int
    problem_statement: str
    mbti: str
    mbti_axis_values: dict[str, int]
    sdg_tags: list[str]
    narrative_markdown: str
    history: list[TeamfitInterviewTurnResponse]
    can_request_followup: bool
    updated_at: datetime


class TeamfitExplorerMeResponse(BaseModel):
    profile: TeamfitExplorerProfileResponse | None
    active_profile_count: int


class TeamfitSignalConfidence(BaseModel):
    problem_statement: float = Field(default=0.0, ge=0.0, le=1.0)
    role: float = Field(default=0.0, ge=0.0, le=1.0)
    work_style: float = Field(default=0.0, ge=0.0, le=1.0)


class TeamfitWorkStyleSignals(BaseModel):
    planning_style: str = ""
    communication_style: str = ""
    decision_style: str = ""
    execution_speed: str = ""


class TeamfitExtractedSignals(BaseModel):
    problem_statement: str = ""
    problem_themes: list[str] = Field(default_factory=list)
    why_this_problem_now: str = ""
    offered_role: str = ""
    wanted_teammate_role: str = ""
    core_strengths: list[str] = Field(default_factory=list)
    value_themes: list[str] = Field(default_factory=list)
    work_style: TeamfitWorkStyleSignals = Field(default_factory=TeamfitWorkStyleSignals)
    must_have_signals: list[str] = Field(default_factory=list)
    avoid_signals: list[str] = Field(default_factory=list)
    sdgs: list[str] = Field(default_factory=list)
    conversation_hooks: list[str] = Field(default_factory=list)
    tension_points: list[str] = Field(default_factory=list)
    profile_clarity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    signal_confidence: TeamfitSignalConfidence = Field(default_factory=TeamfitSignalConfidence)
    summary_for_embedding: str = ""


TeamfitRecommendationType = Literal["safe_fit", "complementary_fit", "wildcard_fit"]


class TeamfitRecommendationReasonDetail(BaseModel):
    problem_resonance: str
    role_complementarity: str
    work_style: str
    value_alignment: str
    conversation_potential: str


class TeamfitConversationPriorityRecommendation(BaseModel):
    type: TeamfitRecommendationType
    candidate_id: str
    user_id: int
    name: str
    problem_statement: str
    offered_role: str = ""
    sdgs: list[str] = Field(default_factory=list)
    mbti: str | None = None
    base_score: float
    reason_summary: str
    reason_detail: TeamfitRecommendationReasonDetail
    first_question_to_ask: str
    uncertainty_note: str
    is_verified: bool
    email: str | None = None
    github_address: str | None = None
    notion_url: str | None = None
    history: list[TeamfitInterviewTurnResponse] = Field(default_factory=list)


class TeamfitRejectedCandidate(BaseModel):
    candidate_id: str
    name: str = ""
    reason: str
    problem_statement: str = ""
    offered_role: str = ""
    sdgs: list[str] = Field(default_factory=list)
    mbti: str | None = None
    is_verified: bool = False
    email: str | None = None
    github_address: str | None = None
    notion_url: str | None = None


class TeamfitRecommendationSystemNotes(BaseModel):
    scoring_explanation: str
    limits: str
    next_improvement: str


class TeamfitFitCheckUpdate(BaseModel):
    fit_score: int | None = Field(default=None, ge=0, le=100)
    fit_note: str | None = Field(default=None, max_length=500)


class TeamfitFitCheckState(BaseModel):
    target_user_id: int
    fit_score: int | None = Field(default=None, ge=0, le=100)
    fit_note: str | None = None
    updated_at: datetime


class TeamfitCandidateDirectoryItem(BaseModel):
    user_id: int
    candidate_id: str
    name: str
    has_teamfit_profile: bool
    fit_score: int | None = Field(default=None, ge=0, le=100)
    fit_note: str | None = None
    reason_summary: str
    reason_detail: TeamfitRecommendationReasonDetail | None = None
    problem_statement: str = ""
    offered_role: str = ""
    sdgs: list[str] = Field(default_factory=list)
    mbti: str | None = None
    is_verified: bool
    email: str | None = None
    github_address: str | None = None
    notion_url: str | None = None
    history: list[TeamfitInterviewTurnResponse] = Field(default_factory=list)
    created_at: datetime
    profile_updated_at: datetime | None = None
    teamfit_score: float | None = None
    teamfit_rank: int | None = None


class TeamfitCandidateDirectoryResponse(BaseModel):
    candidates: list[TeamfitCandidateDirectoryItem] = Field(default_factory=list)
    total_count: int


class TeamfitRecommendationsResponse(BaseModel):
    requires_profile: bool = False
    requires_approval: bool = False
    active_profile_count: int
    recommended_people: list[TeamfitConversationPriorityRecommendation] = Field(default_factory=list)
    rejected_or_low_signal_candidates: list[TeamfitRejectedCandidate] = Field(default_factory=list)
    system_notes: TeamfitRecommendationSystemNotes
