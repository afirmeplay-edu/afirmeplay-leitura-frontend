"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LoginForm = dynamic(() => import("@/components/auth/login-form").then((mod) => mod.LoginForm), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#1E3A8A]">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  ),
});

export default function LoginPage() {
  return <LoginForm />;
}
