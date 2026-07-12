import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDatabase } from "@/src/db/client";
import {
  getCurrentSessionUser,
  login as loginService,
  logout as logoutService,
  registerMawkibOwner,
  updateProfile as updateProfileService,
  changePassword as changePasswordService,
} from "@/src/services/auth";
import type { User, UserProfileInput } from "@/src/types";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isReady: boolean;
  login: (mobileNumber: string, password: string) => Promise<void>;
  register: (input: {
    fullName: string;
    mobileNumber: string;
    password: string;
    province?: string;
    city?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UserProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const sessionUser = await getCurrentSessionUser();
    setUser(sessionUser);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await getDatabase();
        const sessionUser = await getCurrentSessionUser();
        if (mounted) setUser(sessionUser);
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsReady(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (mobileNumber: string, password: string) => {
    const loggedIn = await loginService({ mobileNumber, password });
    setUser(loggedIn);
  }, []);

  const register = useCallback(
    async (input: {
      fullName: string;
      mobileNumber: string;
      password: string;
      province?: string;
      city?: string;
    }) => {
      const created = await registerMawkibOwner(input);
      setUser(created);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: UserProfileInput) => {
      if (!user) throw new Error("وارد نشده‌اید");
      const updated = await updateProfileService(user.id, input);
      setUser(updated);
    },
    [user],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error("وارد نشده‌اید");
      await changePasswordService({
        userId: user.id,
        currentPassword,
        newPassword,
      });
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isReady,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    }),
    [
      user,
      isLoading,
      isReady,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
