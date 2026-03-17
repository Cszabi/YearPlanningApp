import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role !== "Admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
