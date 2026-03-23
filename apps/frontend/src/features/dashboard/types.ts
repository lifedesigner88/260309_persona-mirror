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
};

export type MemberCard = {
  seat: number;
  user_id: number | null;
  name: string | null;
  gender: string | null;
  email: string | null;
  github_address: string | null;
  notion_url: string | null;
};
