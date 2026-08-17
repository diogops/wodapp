import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EXERCISE_CATEGORIES,
  FOCUS_AREAS,
  exercisesByCategory,
  type ExerciseCategory,
} from "@shared/exerciseCatalog";
import { Loader2, PenLine, Sparkles, X } from "lucide-react";
import { useState } from "react";

type Step = "ask" | "pick";
type PickTab = "exercises" | "focus" | "wishlist";

export type SurpriseWodSelection = {
  exercises: string[];
  focusAreas: string[];
  notes?: string;
  wishlist?: string;
};

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        selected
          ? "border-[#e06b3c] bg-[#e06b3c] text-white"
          : "border-[#dedfd6] bg-white text-[#20231f] hover:border-[#c9cbc0]"
      }`}
    >
      {label}
    </button>
  );
}

export function SurpriseWodDialog({
  busy,
  onClose,
  onGenerate,
}: {
  busy: boolean;
  onClose: () => void;
  onGenerate: (selection: SurpriseWodSelection) => void;
}) {
  const [step, setStep] = useState<Step>("ask");
  const [tab, setTab] = useState<PickTab>("exercises");
  const [exercises, setExercises] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [wishlist, setWishlist] = useState("");
  const [openCategory, setOpenCategory] = useState<ExerciseCategory>(EXERCISE_CATEGORIES[0]);

  const total = exercises.length + focusAreas.length + (wishlist.trim() ? 1 : 0);

  return (
    <div className="app-overlay fixed inset-0 z-[75] grid place-items-center bg-[#20231f]/70 p-4">
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[#f7f7f2] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Criar WOD surpresa"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#dedfd6] p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e06b3c]">
              WOD surpresa
            </p>
            <h3 className="font-display text-xl font-semibold">
              {step === "ask" ? "Como você quer montar?" : "Escolha o que entra"}
            </h3>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {step === "ask" ? (
          <div className="space-y-3 p-4">
            <p className="text-sm leading-6 text-[#6d746a]">
              Quer escolher os exercícios e o que trabalhar, ou prefere que a IA monte tudo?
            </p>
            <Button
              className="w-full justify-start bg-[#20231f] text-[#f7f7f2] hover:bg-[#333a31]"
              onClick={() => setStep("pick")}
            >
              Escolher exercícios e foco
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setTab("wishlist");
                setStep("pick");
              }}
            >
              <PenLine className="mr-2 h-4 w-4" />
              Escrever os exercícios que quero
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={busy}
              onClick={() => onGenerate({ exercises: [], focusAreas: [] })}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Deixar a IA montar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-[#dedfd6] px-4 pt-3" role="tablist">
              {(
                [
                  ["exercises", "Exercícios"],
                  ["focus", "O que trabalhar"],
                  ["wishlist", "Escrever"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`rounded-t-xl px-3 py-2 text-sm font-medium ${
                    tab === value
                      ? "bg-white text-[#20231f] shadow-[0_-1px_0_#dedfd6_inset]"
                      : "text-[#6d746a]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tab === "wishlist" ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d746a]">
                    Exercícios que você quer neste treino
                  </label>
                  <Textarea
                    className="mt-1.5 bg-white"
                    rows={6}
                    placeholder={"Um por linha, do seu jeito. Ex.:\nthruster\nbarra fixa\ncorrida 400m\nabdominal"}
                    value={wishlist}
                    onChange={event => setWishlist(event.target.value)}
                  />
                  <p className="mt-2 text-xs leading-5 text-[#6d746a]">
                    Todos aparecem no workout. A IA monta o resto em volta —
                    aquecimento, ordem dos blocos e movimentos complementares.
                  </p>
                </div>
              ) : tab === "exercises" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {EXERCISE_CATEGORIES.map(category => (
                      <Chip
                        key={category}
                        label={category}
                        selected={openCategory === category}
                        onClick={() => setOpenCategory(category)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {exercisesByCategory(openCategory).map(exercise => (
                      <Chip
                        key={exercise.name}
                        label={exercise.name}
                        selected={exercises.includes(exercise.name)}
                        onClick={() => setExercises(prev => toggle(prev, exercise.name))}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {FOCUS_AREAS.map(area => (
                    <Chip
                      key={area}
                      label={area}
                      selected={focusAreas.includes(area)}
                      onClick={() => setFocusAreas(prev => toggle(prev, area))}
                    />
                  ))}
                </div>
              )}

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d746a]">
                  Observações (opcional)
                </label>
                <Textarea
                  className="mt-1.5 bg-white"
                  rows={2}
                  placeholder="Ex.: tenho 40 minutos, sem barra, ombro direito sensível"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#dedfd6] p-4">
              <span className="text-xs text-[#6d746a]" aria-live="polite">
                {total ? `${total} selecionado${total > 1 ? "s" : ""}` : "Nada selecionado"}
              </span>
              <Button
                className="bg-[#e06b3c] text-white hover:bg-[#c8562c]"
                disabled={busy}
                onClick={() =>
                  onGenerate({
                    exercises,
                    focusAreas,
                    notes: notes.trim() || undefined,
                    wishlist: wishlist.trim() || undefined,
                  })
                }
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Gerar workout
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
