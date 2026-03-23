export type SessionUser = {
  user_id: number;
  is_admin: boolean;
  created_at: string;
};

export type RootLoaderData = {
  sessionUser: SessionUser | null;
};

export type AuthActionData = {
  error?: string;
  signupEmail?: string;
  verified?: boolean;
};
