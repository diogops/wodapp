import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Play, RefreshCw, Save, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";

type Draft = { workout: any; createdAt?: Date | string };

/**
 * Proposta da IA aguardando decisão. É um rascunho persistido, então continua
 * aqui depois de fechar a aba — daí ele se apresentar como notificação e não
 * como um modal que precisa ser resolvido na hora.
 */
export function DraftWodPanel({
  draft,
  busy,
  onClose,
  onAccept,
  onDiscard,
  onRevise,
}: {
  draft: Draft;
  busy: boolean;
  onClose: () => void;
  onAccept: (startNow: boolean) => void;
  onDiscard: () => void;
  onRevise: (changeRequest: string) => void;
}) {
  const [revising, setRevising] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const workout = draft.workout ?? {};

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-[#20231f]/70 p-4">
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[#f7f7f2] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Workout proposto pela IA"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#dedfd6] p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e06b3c]">
              Proposta da IA
            </p>
            <h3 className="font-display text-xl font-semibold">{workout.title || "Workout"}</h3>
            {workout.focus && (
              <p className="mt-1 text-sm text-[#6d746a]">{workout.focus}</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {(workout.sections ?? []).map((section: any, sectionIndex: number) => (
            <section key={sectionIndex} className="rounded-2xl border border-[#dedfd6] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">{section.title}</h4>
                {section.format && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e06b3c]">
                    {section.format}
                  </span>
                )}
              </div>
              {(section.exercises ?? []).map((exercise: any, exerciseIndex: number) => (
                <div
                  key={exerciseIndex}
                  className="flex flex-wrap items-baseline gap-x-2 border-t border-[#ecece6] py-1.5 first:border-0 first:pt-0"
                >
                  <span className="text-sm font-medium">{exercise.name}</span>
                  <span className="text-xs text-[#6d746a]">
                    {exercise.prescription ||
                      [exercise.sets, exercise.reps, exercise.duration, exercise.load]
                        .filter(Boolean)
                        .join(" · ")}
                  </span>
                </div>
              ))}
              {section.notes && (
                <p className="mt-2 rounded-xl bg-[#f1f1eb] p-2 text-xs leading-5 text-[#6d746a]">
                  {section.notes}
                </p>
              )}
            </section>
          ))}
          {workout.notes && (
            <p className="px-1 text-xs leading-5 text-[#6d746a]">{workout.notes}</p>
          )}
        </div>

        {revising ? (
          <div className="space-y-2 border-t border-[#dedfd6] p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d746a]">
              O que você quer trocar?
            </label>
            <Input
              autoFocus
              className="bg-white"
              placeholder="Ex.: troca os exercícios de ombro, tira a corrida"
              value={changeRequest}
              onChange={event => setChangeRequest(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && changeRequest.trim()) onRevise(changeRequest.trim());
              }}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#20231f] text-[#f7f7f2] hover:bg-[#333a31]"
                disabled={busy || !changeRequest.trim()}
                onClick={() => onRevise(changeRequest.trim())}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Refazer com esse ajuste
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setRevising(false)}>
                Voltar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 border-t border-[#dedfd6] p-4">
            <Button
              className="col-span-2 bg-[#e06b3c] text-white hover:bg-[#c8562c]"
              disabled={busy}
              onClick={() => onAccept(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              Aceitar e treinar agora
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => onAccept(false)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar na grade
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setRevising(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Trocar exercícios
            </Button>
            <Button
              variant="ghost"
              className="col-span-2 text-[#b14a35]"
              disabled={busy}
              onClick={onDiscard}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Descartar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
