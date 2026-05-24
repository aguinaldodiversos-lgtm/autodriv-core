import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AcessoNegadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-xl font-semibold text-slate-950">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sua conta não tem permissão para acessar esta área.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex">
          <Button>Voltar ao dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
