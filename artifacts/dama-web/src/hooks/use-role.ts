export type UserRole = "admin" | "manager" | "viewer";

function parseRole(): UserRole {
  try {
    const token = localStorage.getItem("dama_token");
    if (!token) return "viewer";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.role as UserRole) || "viewer";
  } catch {
    return "viewer";
  }
}

export function useRole() {
  const role = parseRole();
  return {
    role,
    isAdmin: role === "admin",
    canEdit: role === "admin" || role === "manager",
    canDelete: role === "admin",
    canImport: role === "admin" || role === "manager",
  };
}
