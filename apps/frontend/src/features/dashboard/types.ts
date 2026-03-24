export type SlotCell = {
  date: string;
  time_slot: number;
  room: number;
  seat: number;
  color: "gray" | "blue" | "pink";
  user_id: number | null;
};

export type DashboardGrid = {
  cells: SlotCell[];
  total_slots: number;
  filled_slots: number;
  approved_member_count: number;
};

export type MemberCard = {
  seat: number;
  user_id: number | null;
  name: string | null;
  birth_year: number | null;
  residence: string | null;
  gender: string | null;
  email: string | null;
  github_address: string | null;
  notion_url: string | null;
  is_checked?: boolean;
};

export type MemberCheckState = {
  target_user_id: number;
  is_checked: boolean;
};
