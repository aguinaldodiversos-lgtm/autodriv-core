"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { recordAiActionOutcome } from "@/lib/api/ia";
import type { AiActionOutcomePayload, AiOutcomeType } from "@/types/ia";

type OutcomeAction = {
  id: number;
  reason?: string;
  suggested_action?: string;
};

const outcomeOptions: Array<{ value: AiOutcomeType; label: string }> = [
  { value: "reply", label: "Gerou resposta" },
  { value: "proposal", label: "Gerou proposta" },
  { value: "appointment", label: "Gerou agendamento" },
  { value: "sale", label: "Gerou venda" },
  { value: "repurchase", label: "Gerou recompra" },
  { value: "no_result", label: "Sem resultado ainda" }
];

export function ActionOutcomeModal({
  action,
  source,
  onClose,
  onSaved
}: {
  action: OutcomeAction | null;
  source: "dashboard" | "ia";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcomeType, setOutcomeType] = useState<AiOutcomeType>("reply");
  const [outcomeValue, setOutcomeValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!action) return;
    setOutcomeType("reply");
    setOutcomeValue("");
    setNotes("");
    setError(null);
  }, [action]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;

    setError(null);
    setIsSaving(true);

    const payload: AiActionOutcomePayload = {
      outcome_type: outcomeType,
      outcome_value: outcomeValue ? Number(outcomeValue) : null,
      notes,
      metadata: { source }
    };

    try {
      await recordAiActionOutcome(action.id, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar o resultado.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={Boolean(action)} title="Resultado da ação" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-950">{action?.suggested_action}</p>
          {action?.reason ? <p className="mt-1 text-sm text-slate-500">{action.reason}</p> : null}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-2 block">Resultado</span>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            value={outcomeType}
            onChange={(event) => setOutcomeType(event.target.value as AiOutcomeType)}
          >
            {outcomeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Valor envolvido"
          inputMode="decimal"
          placeholder="Ex: 85000"
          value={outcomeValue}
          onChange={(event) => setOutcomeValue(event.target.value)}
        />

        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-2 block">Observação</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            placeholder="Ex: cliente respondeu no WhatsApp e pediu simulação"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Registrar depois
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar resultado"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
