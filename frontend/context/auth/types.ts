
import { UserProfile, Session } from "@/types/auth";

export interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, full_name: string, csrfToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, csrfToken: string) => Promise<void>;
  updatePassword: (token: string, newPassword: string, csrfToken: string) => Promise<void>;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isAdmin?: boolean;
  resendVerificationEmail: () => Promise<void>;
}
