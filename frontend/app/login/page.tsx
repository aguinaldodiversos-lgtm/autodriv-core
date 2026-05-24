"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CarFront } from "lucide-react";
import { getCurrentSession, login, register } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [dealershipName, setDealershipName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result =
        mode === "register"
          ? await register({
              dealership_name: dealershipName,
              name,
              email,
              password
            })
          : await login({ email, password });
      const profile = await getCurrentSession(result.token);
      saveSession(result.token, profile);
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "register"
            ? "Nao foi possivel criar a conta."
            : "Nao foi possivel entrar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          {mode === "register" ? "Criar conta" : "Entrar"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "register"
            ? "Abra uma loja em teste para examinar o painel."
            : "Use seu acesso do AutoDriv."}
        </p>
        <div className="mt-5 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`h-9 rounded text-sm font-medium transition ${
              mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`h-9 rounded text-sm font-medium transition ${
              mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            Criar conta
          </button>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {mode === "register" ? (
          <>
            <Input
              label="Nome da loja"
              value={dealershipName}
              onChange={(event) => setDealershipName(event.target.value)}
              autoComplete="organization"
              required
            />
            <Input
              label="Seu nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </>
        ) : null}
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
        {loading ? "Processando..." : mode === "register" ? "Criar conta e entrar" : "Entrar"}
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
