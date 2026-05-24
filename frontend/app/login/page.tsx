"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CarFront } from "lucide-react";
import { login } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login({ email, password });
      saveSession(result.token);
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Entrar</h2>
        <p className="mt-1 text-sm text-slate-500">Use seu acesso do AutoDriv.</p>
      </div>
      <div className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <Button className="mt-6 w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_460px]">
      <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/10 p-2">
            <CarFront className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">AutoDriv</p>
            <p className="text-sm text-slate-300">CRM automotivo inteligente</p>
          </div>
        </div>
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight">
            Gestao comercial, estoque e IA no mesmo cockpit.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Uma operacao mais previsivel para lojas que precisam responder rapido,
            priorizar oportunidades e vender com margem.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <Suspense fallback={<div className="text-sm text-slate-500">Carregando login...</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
