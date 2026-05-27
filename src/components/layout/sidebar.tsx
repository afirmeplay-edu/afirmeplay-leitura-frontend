"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAV_ITEMS } from "@/config/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="flex h-screen w-72 flex-col border-r bg-gradient-to-b from-[#1E3A8A] to-[#2563EB] p-4 text-white">
      <div className="mb-8 rounded-xl bg-white/10 p-4">
        <Image
          src="/AFIRME-PLAY-LOGO-branco.png"
          alt="Afirme Play"
          width={170}
          height={58}
          className="h-10 w-auto object-contain"
        />
        <p className="mt-3 text-xs text-blue-100">{user?.name ?? "Usuario"}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        <Link
          href="/app"
          className={cn(
            "rounded-lg px-3 py-2 text-sm transition",
            pathname === "/app" ? "bg-white/20" : "hover:bg-white/10"
          )}
        >
          Inicio
        </Link>
        {APP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                pathname === item.href ? "bg-white/20" : "hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        className="justify-start text-white hover:bg-white/10 hover:text-white"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </aside>
  );
}
