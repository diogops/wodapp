import { Button } from "@/components/ui/button";
import { LOAD_STEP_KG, adjustLoad, advanceSet, type SetPlan } from "@/lib/straightSets";
import { formatTimerDisplay } from "@/lib/workoutTimer";
import { Check, Minus, Plus, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Execução de um bloco `straight_sets`.
 *
 * Fluxo de musculação, que é diferente do de CrossFit: a série é a unidade, o
 * descanso dispara sozinho ao confirmar, e a carga é registrada sem sair da
 * tela — parar o treino para digitar é o atrito que faz ninguém registrar nada.
 */
export function SetTracker({
  exerciseName,
  plan,
  suggestedLoad,
  loadHint,
  onLogSet,
  onFinish,
}: {
  exerciseName: string;
  plan: SetPlan;
  suggestedLoad?: string;
  /** Alvo do programa ("RPE 7", "70% 1RM"): vai de placeholder, não de valor — o campo é de carga. */
  loadHint?: string;
  onLogSet: (entry: { setIndex: number; load?: string }) => void;
  onFinish: () => void;
}) {
  const [setIndex, setSetIndex] = useState(0);
  const [load, setLoad] = useState(suggestedLoad ?? "");
  const [resting, setResting] = useState<number | null>(null);

  useEffect(() => {
    if (resting === null) return;
    if (resting <= 0) {
      setResting(null);
      return;
    }
    const id = window.setTimeout(() => setResting(value => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [resting]);

  const completeSet = () => {
    onLogSet({ setIndex, load: load.trim() || undefined });
    const { nextIndex, finished } = advanceSet(setIndex, plan);
    setSetIndex(nextIndex);
    // Sem descanso depois da última série: o bloco acabou.
    if (finished) onFinish();
    else setResting(plan.restSeconds);
  };

  const done = setIndex >= plan.total;

  // Uma linha só, dentro da linha do exercício (que já mostra o nome): o
  // bloco de séries tem que ter a mesma cara dos outros, não um card próprio.
  const counter = (
    <span className="w-9 shrink-0 text-xs font-semibold tabular-nums text-[#6d746a]" aria-label={`Série ${Math.min(setIndex + 1, plan.total)} de ${plan.total}`}>
      {Math.min(setIndex + 1, plan.total)}/{plan.total}
    </span>
  );
  return (
    <div className="workout-set-tracker mt-1.5 flex h-8 items-center gap-1.5">
      {resting !== null ? (
        // Descanso ocupa o lugar do controle: durante ele não há nada a fazer
        // além de esperar ou pular, e mostrar os dois juntos convida a erro.
        <div className="flex h-8 flex-1 items-center justify-between gap-2 rounded-lg bg-[#20231f] px-2.5 text-[#f7f7f2]">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f29a73]">Descanso</span>
          <span className="font-semibold tabular-nums" aria-live="polite">{formatTimerDisplay(resting)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-white hover:bg-white/10"
            onClick={() => setResting(null)}
          >
            <SkipForward className="mr-1 h-3.5 w-3.5" />
            Pular
          </Button>
        </div>
      ) : done ? (
        <p className="text-xs text-[#47704b]">Séries concluídas.</p>
      ) : (
        <>
          {counter}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Diminuir ${LOAD_STEP_KG} kg`}
            onClick={() => setLoad(current => adjustLoad(current, -LOAD_STEP_KG))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <input
            className="h-8 min-w-0 flex-1 rounded-lg border border-[#dedfd6] bg-white px-2 text-center text-sm tabular-nums"
            placeholder={loadHint ?? "Carga"}
            inputMode="decimal"
            aria-label={`Carga de ${exerciseName}`}
            value={load}
            onChange={event => setLoad(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Aumentar ${LOAD_STEP_KG} kg`}
            onClick={() => setLoad(current => adjustLoad(current, LOAD_STEP_KG))}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            className="h-8 shrink-0 bg-[#e06b3c] px-2.5 text-xs text-white hover:bg-[#c8562c]"
            aria-label={`Série ${setIndex + 1} de ${exerciseName} feita`}
            onClick={completeSet}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Série
          </Button>
        </>
      )}
    </div>
  );
}
