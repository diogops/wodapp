import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { useState } from "react";

/** Fecho da sessão, para as modalidades cuja gramática tem `sessionReviewHint`. */
export function SessionReview({
  hint,
  onCancel,
  onConfirm,
}: {
  hint: string;
  onCancel: () => void;
  onConfirm: (review: { rpe?: number; notes?: string }) => void;
}) {
  const [rpe, setRpe] = useState<number>();
  const [notes, setNotes] = useState("");
  return (
    <div className="app-overlay fixed inset-0 z-[80] grid place-items-center bg-[#20231f]/70 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#f7f7f2] p-4 text-[#20231f] shadow-2xl" role="dialog" aria-modal="true" aria-label="Como foi a sessão">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Como foi a sessão?</h3>
          <Button type="button" variant="ghost" size="icon" aria-label="Voltar ao treino" onClick={onCancel}><X className="h-5 w-5" /></Button>
        </div>
        <p className="mb-1.5 text-sm font-medium">Esforço (RPE)</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={rpe === value}
              className={`h-9 rounded-lg border text-sm font-semibold tabular-nums ${rpe === value ? "border-[#20231f] bg-[#20231f] text-white" : "border-[#dedfd6] bg-white"}`}
              onClick={() => setRpe(rpe === value ? undefined : value)}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-sm font-medium" htmlFor="session-notes">Observações</label>
        <Textarea id="session-notes" className="mt-1.5 bg-white" maxLength={2000} rows={3} placeholder={hint} value={notes} onChange={event => setNotes(event.target.value)} />
        <Button className="mt-3 w-full bg-[#e06b3c] text-white hover:bg-[#c8562c]" onClick={() => onConfirm({ rpe, notes: notes.trim() || undefined })}>
          <Check className="mr-2 h-4 w-4" />
          Concluir
        </Button>
      </div>
    </div>
  );
}
