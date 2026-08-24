"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LoginForm = dynamic(() => import("@/components/auth/login-form").then((mod) => mod.LoginForm), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-gradient-to-b from-[#EAF2FF] to-[#B8D4FF]">
      <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
    </div>
  ),
});

export default function LoginPage() {
  return <LoginForm />;
}
