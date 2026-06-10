import { AuthGuard } from "@/components/auth/auth-guard";
import { PrivateShell } from "@/components/layout/private-shell";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PrivateShell>{children}</PrivateShell>
    </AuthGuard>
  );
}
