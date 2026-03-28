import i18n from "@/lib/i18n";

import type {
  TeamFitCandidateDirectoryResponse,
  TeamFitConversationPriorityResponse,
  TeamFitExplorerMeResponse,
  TeamFitExplorerProfile,
  TeamFitFinalSaveRequest,
  TeamFitFitCheckState,
  TeamFitFitCheckUpdate,
  TeamFitFollowupAnswerRequest,
  TeamFitInterviewQuestionRequest,
  TeamFitInterviewQuestionResponse,
  TeamFitLoaderData
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function teamFitError(fallbackKey: string, response?: Response) {
  const detail = response ? `${response.status}` : "";
  return new Error(`${i18n.t(fallbackKey)}${detail ? ` (${detail})` : ""}`);
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function throwTeamFitError(fallbackKey: string, response: Response): Promise<never> {
  let detail: string | undefined;

  try {
    const payload = (await response.json()) as { detail?: string };
    detail = typeof payload?.detail === "string" ? payload.detail : undefined;
  } catch {
    // Ignore parse errors and fall back to a generic message below.
  }

  throw detail ? new Error(detail) : teamFitError(fallbackKey, response);
}

async function postJson<TResponse, TRequest>(path: string, payload?: TRequest): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.interviewFailed", response);
  }

  return readJson<TResponse>(response);
}

export async function teamFitLoader(): Promise<TeamFitLoaderData> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include"
  });

  if (response.status === 401) {
    return {
      sessionUser: null
    };
  }
  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.sessionLoadFailed", response);
  }

  return {
    sessionUser: (await response.json()) as TeamFitLoaderData["sessionUser"]
  };
}

export async function fetchTeamFitMe(): Promise<TeamFitExplorerMeResponse> {
  const response = await fetch(`${API_BASE_URL}/team-fit/me`, {
    credentials: "include"
  });

  if (response.status === 401 || response.status === 404) {
    return {
      profile: null,
      active_profile_count: 0
    };
  }
  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.profileLoadFailed", response);
  }

  return readJson<TeamFitExplorerMeResponse>(response);
}

export async function requestTeamFitInterviewQuestion(
  payload: TeamFitInterviewQuestionRequest
): Promise<TeamFitInterviewQuestionResponse> {
  return postJson<TeamFitInterviewQuestionResponse, TeamFitInterviewQuestionRequest>(
    "/team-fit/interview/next-question",
    payload
  );
}

export async function saveTeamFitProfile(
  payload: TeamFitFinalSaveRequest
): Promise<TeamFitExplorerProfile> {
  const response = await fetch(`${API_BASE_URL}/team-fit/me`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.profileSaveFailed", response);
  }

  return readJson<TeamFitExplorerProfile>(response);
}

export async function requestTeamFitFollowupQuestion(): Promise<TeamFitInterviewQuestionResponse> {
  return postJson<TeamFitInterviewQuestionResponse, undefined>("/team-fit/interview/follow-up");
}

export async function fetchTeamFitRecommendations(): Promise<TeamFitConversationPriorityResponse> {
  const response = await fetch(`${API_BASE_URL}/team-fit/recommendations`, {
    credentials: "include"
  });

  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.recommendationsLoadFailed", response);
  }

  return readJson<TeamFitConversationPriorityResponse>(response);
}

export async function fetchTeamFitCandidateDirectory(): Promise<TeamFitCandidateDirectoryResponse> {
  const response = await fetch(`${API_BASE_URL}/team-fit/candidates`, {
    credentials: "include"
  });

  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.recommendationsLoadFailed", response);
  }

  return readJson<TeamFitCandidateDirectoryResponse>(response);
}

export async function saveTeamFitFollowupAnswer(
  payload: TeamFitFollowupAnswerRequest
): Promise<TeamFitExplorerProfile> {
  return postJson<TeamFitExplorerProfile, TeamFitFollowupAnswerRequest>(
    "/team-fit/interview/follow-up-answer",
    payload
  );
}

export async function saveTeamFitFitCheck(
  targetUserId: number,
  payload: TeamFitFitCheckUpdate
): Promise<TeamFitFitCheckState> {
  const response = await fetch(`${API_BASE_URL}/team-fit/fit-checks/${targetUserId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await throwTeamFitError("teamfit.errors.fitCheckSaveFailed", response);
  }

  return readJson<TeamFitFitCheckState>(response);
}
