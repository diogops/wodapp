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
  onLogSet,
  onFinish,
}: {
  exerciseName: string;
  plan: SetPlan;
  suggestedLoad?: string;
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

  return (
    <div className="rounded-2xl border border-[#dedfd6] bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold">{exerciseName}</p>
        <p className="shrink-0 text-xs font-semibold tabular-nums text-[#6d746a]">
          Série {Math.min(setIndex + 1, plan.total)}/{plan.total}
          {plan.reps ? ` · ${plan.reps} reps` : ""}
        </p>
      </div>

      {resting !== null ? (
        // Descanso ocupa o lugar do controle: durante ele não há nada a fazer
        // além de esperar ou pular, e mostrar os dois juntos convida a erro.
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#20231f] px-3 py-2 text-[#f7f7f2]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f29a73]">Descanso</p>
            <p className="font-display text-2xl font-semibold tabular-nums" aria-live="polite">
              {formatTimerDisplay(resting)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
            onClick={() => setResting(null)}
          >
            <SkipForward className="mr-1 h-3.5 w-3.5" />
            Pular
          </Button>
        </div>
      ) : done ? (
        <p className="mt-2 text-sm text-[#47704b]">Bloco concluído.</p>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label={`Diminuir ${LOAD_STEP_KG} kg`}
              onClick={() => setLoad(current => adjustLoad(current, -LOAD_STEP_KG))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <input
              className="h-9 min-w-0 flex-1 rounded-lg border border-[#dedfd6] bg-white px-2 text-center text-sm tabular-nums"
              placeholder="Carga"
              aria-label={`Carga de ${exerciseName}`}
              value={load}
              onChange={event => setLoad(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label={`Aumentar ${LOAD_STEP_KG} kg`}
              onClick={() => setLoad(current => adjustLoad(current, LOAD_STEP_KG))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="mt-2 h-11 w-full bg-[#e06b3c] text-white hover:bg-[#c8562c]"
            onClick={completeSet}
          >
            <Check className="mr-2 h-4 w-4" />
            Série feita
          </Button>
        </>
      )}
    </div>
  );
}
