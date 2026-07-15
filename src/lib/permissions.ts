import type { RoleName, User } from "@/src/types";

export function isMawkibOwner(user: User | null | undefined): boolean {
  return !!user?.roles.includes("MawkibOwner");
}

export function isMawkibServant(user: User | null | undefined): boolean {
  return !!user?.roles.includes("MawkibServant") && !isMawkibOwner(user);
}

export function canAccessManagement(user: User | null | undefined): boolean {
  return isMawkibOwner(user);
}

export function canAccessReports(user: User | null | undefined): boolean {
  return isMawkibOwner(user);
}

export function canDeleteData(user: User | null | undefined): boolean {
  return isMawkibOwner(user);
}

export function canCancelReservation(user: User | null | undefined): boolean {
  return isMawkibOwner(user) || isMawkibServant(user);
}

export function canManageServants(user: User | null | undefined): boolean {
  return isMawkibOwner(user);
}

export function roleLabel(role: RoleName): string {
  switch (role) {
    case "MawkibOwner":
      return "موکب‌دار";
    case "MawkibServant":
      return "خادم";
    case "Pilgrim":
      return "زائر";
    case "HonoraryServant":
      return "خادم افتخاری";
    case "Admin":
      return "مدیر";
    default:
      return role;
  }
}
