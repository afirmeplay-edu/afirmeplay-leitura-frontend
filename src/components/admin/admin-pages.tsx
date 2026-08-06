"use client";

import Link from "next/link";
import { useState } from "react";
import { User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { SectionCard } from "@/components/shared/section-card";
import { FormDialog } from "@/components/shared/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

export function PerfilPage() {
  const user = useAuthStore((s) => s.user);
  const [passwordDialog, setPasswordDialog] = useState(false);

  return (
    <PageShell>
      <PageHeader title="Meu perfil" description="Gerencie suas informacoes pessoais." icon={User} />

      <SectionCard title="Dados pessoais" description="Informacoes da sua conta">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Nome</Label><Input defaultValue={user?.name ?? ""} /></div>
          <div className="space-y-2"><Label>Email</Label><Input defaultValue={user?.email ?? ""} /></div>
        </div>
        <Button className="mt-4">Salvar alteracoes (mock)</Button>
      </SectionCard>

      <SectionCard title="Alterar senha" description="Atualize sua senha de acesso">
        <Button variant="outline" onClick={() => setPasswordDialog(true)}>Alterar senha</Button>
      </SectionCard>

      <FormDialog
        open={passwordDialog}
        onOpenChange={setPasswordDialog}
        title="Alterar senha"
        description="Defina uma nova senha para sua conta."
        icon={User}
        onSubmit={() => setPasswordDialog(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2"><Label>Senha atual</Label><Input type="password" /></div>
          <div className="space-y-2"><Label>Nova senha</Label><Input type="password" /></div>
        </div>
      </FormDialog>
    </PageShell>
  );
}

export function RecuperarSenhaPage() {
  const [step, setStep] = useState(1);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-bluebrand-deep to-bluebrand-base p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6">
          <h1 className="text-xl font-bold text-foreground">Recuperar senha</h1>
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Informe seu e-mail para receber o codigo de recuperacao.</p>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="seu@email.com" /></div>
              <Button className="w-full" onClick={() => setStep(2)}>Enviar codigo</Button>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Digite o codigo enviado por e-mail.</p>
              <div className="space-y-2"><Label>Codigo</Label><Input placeholder="000000" /></div>
              <Button className="w-full" onClick={() => setStep(3)}>Verificar</Button>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Defina sua nova senha.</p>
              <div className="space-y-2"><Label>Nova senha</Label><Input type="password" /></div>
              <Button className="w-full" asChild><Link href="/login">Concluir</Link></Button>
            </>
          )}
          <Link href="/login" className="block text-center text-sm text-primary hover:underline">Voltar ao login</Link>
        </CardContent>
      </Card>
    </div>
  );
}
