
export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  role?: 'user' | 'admin';
  email_verified?: boolean;
};

export type Session = {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  } | null;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};
