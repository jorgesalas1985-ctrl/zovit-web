"use client";

import { useAuth } from "@/components/AuthProvider";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import {
  readStoredTourAccount,
  tourAccountToIntranetRole,
  type SuperAdminTourAccount,
  writeStoredTourAccount,
} from "@/lib/auth/superAdminView";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SuperAdminViewContextValue = {
  isRealSuperAdmin: boolean;
  tourAccount: SuperAdminTourAccount;
  setTourAccount: (account: SuperAdminTourAccount) => void;
};

const SuperAdminViewContext = createContext<SuperAdminViewContextValue | null>(null);

export function SuperAdminViewProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isRealSuperAdmin = profile?.intranet_role === "super_admin";
  const [tourAccount, setTourAccountState] = useState<SuperAdminTourAccount>("super_admin");

  useEffect(() => {
    if (!isRealSuperAdmin) {
      setTourAccountState("super_admin");
      return;
    }
    setTourAccountState(readStoredTourAccount() ?? "super_admin");
  }, [isRealSuperAdmin]);

  const setTourAccount = useCallback(
    (account: SuperAdminTourAccount) => {
      if (!isRealSuperAdmin) return;
      setTourAccountState(account);
      writeStoredTourAccount(account);
    },
    [isRealSuperAdmin]
  );

  const value = useMemo(
    () => ({
      isRealSuperAdmin,
      tourAccount: isRealSuperAdmin ? tourAccount : "super_admin",
      setTourAccount,
    }),
    [isRealSuperAdmin, setTourAccount, tourAccount]
  );

  return (
    <SuperAdminViewContext.Provider value={value}>{children}</SuperAdminViewContext.Provider>
  );
}

export function useSuperAdminView() {
  const ctx = useContext(SuperAdminViewContext);
  if (!ctx) {
    return {
      isRealSuperAdmin: false,
      tourAccount: "super_admin" as SuperAdminTourAccount,
      setTourAccount: (_account: SuperAdminTourAccount) => undefined,
    };
  }
  return ctx;
}

/** Rol intranet efectivo para banners y simulación de permisos. */
export function useEffectiveIntranetRole() {
  const { profile } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const real = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;

  if (!isRealSuperAdmin || !real) return real;

  const mapped = tourAccountToIntranetRole(tourAccount);
  return mapped ?? real;
}
