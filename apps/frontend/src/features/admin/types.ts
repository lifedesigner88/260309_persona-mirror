export type AdminUser = {
  user_id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
  github_address?: string | null;
  notion_url?: string | null;
  name?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  residence?: string | null;
  phone?: string | null;
  interview_date?: string | null;
  interview_start_time?: string | null;
  interview_time_slot?: number | null;
  interview_room?: number | null;
  applicant_status?: string;
};
