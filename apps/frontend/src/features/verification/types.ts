export type VerificationApplyPayload = {
  name: string;
  gender: "M" | "F";
  birth_date?: string;
  residence?: string;
  invite_code?: string;
  github_address?: string;
  notion_url?: string;
  interview_date: string;
  interview_start_time: string;
  interview_room: number;
};

export type VerificationInviteCodeCheckResponse = {
  matches_auto_approve_invite_code: boolean;
};

export type VerificationStatusResponse = {
  applicant_status: string;
  name: string | null;
  interview_date: string | null;
  interview_start_time: string | null;
  interview_time_slot: number | null;
  interview_room: number | null;
};
