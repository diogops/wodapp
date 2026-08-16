import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurpriseWodDialog } from "@/components/SurpriseWodDialog";
import { trpc } from "@/lib/trpc";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Dumbbell,
  FileUp,
  Github,
  History as HistoryIcon,
  Loader2,
  LogOut,
  Plus,
  SkipForward,
  Sparkles,
  Timer as TimerIcon,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { chooseRandomWorkoutIndex } from "@/lib/workoutSelection";
import { getWorkoutDemoState, getWorkoutShellClass } from "@/lib/workoutMode";
import {
  buildAndroidTimerIntent,
  formatTimerDisplay,
  getTimerClickAction,
  isAndroid,
  parseDurationToSeconds,
  type TimerStatus,
} from "@/lib/workoutTimer";

type Tab = "today" | "library" | "history";

// Servidas de client/public/demos. Hollow hold, arch hold, russian twist e
// prancha ficaram de fora de propósito: os arquivos correspondentes no storage
// da Manus eram cartões de erro "Image generation failed", não ilustrações.
// Sem entrada aqui, esses exercícios caem no fallback genérico, que é real.
const EXERCISE_DEMOS: Record<string, string> = {
  "double under": "/demos/exercise-double-under_b2e0f869.png",
  "sit-up": "/demos/exercise-sit-up_55407f10.png",
  "push-up": "/demos/exercise-push-up_b66c1513.png",
  "push up": "/demos/exercise-push-up_b66c1513.png",
  dip: "/demos/exercise-dip_ca224257.png",
  paralela: "/demos/exercise-dip_ca224257.png",
  bike: "/demos/exercise-bike_d14f7402.png",
  cardio: "/demos/exercise-bike_d14f7402.png",
  pvc: "/demos/exercise-pvc-transition_0974dc02.png",
  transição: "/demos/exercise-pvc-transition_0974dc02.png",
  generic: "/demos/exercise-generic-movement_6c9cf380.png",
};

/**
 * Aviso de fim de timer. Vibração e áudio são independentes de propósito: no
 * celular no bolso a vibração é o que se percebe, e num navegador que bloqueia
 * autoplay o áudio pode simplesmente não sair. Nenhum dos dois pode derrubar
 * o app, então ambos falham em silêncio.
 */
function signalTimerEnd() {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 500]);
  } catch {}
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [0, 0.45, 0.9].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.32);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {}
}

function getExerciseDemo(name: string) {
  const normalized = name.trim().toLowerCase();
  return Object.entries(EXERCISE_DEMOS).find(([key]) => normalized.includes(key))?.[1] || EXERCISE_DEMOS.generic;
}
const dateLabel = (value: Date | string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Sem data sugerida";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("today");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showCreate, setShowCreate] = useState(false);
  const [showSurprise, setShowSurprise] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [newWorkout, setNewWorkout] = useState({
    title: "",
    focus: "",
    level: "",
    suggestedDate: "",
    notes: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const workoutsQuery = trpc.workouts.list.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const historyQuery = trpc.workouts.history.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const workouts = workoutsQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const completedIds = useMemo(
    () =>
      new Set(
        history
          .filter(item => item.session.action === "completed")
          .map(item => item.session.workoutId)
      ),
    [history]
  );
  const nextPendingIndex = useMemo(() => workouts.findIndex(workout => !completedIds.has(workout.id)), [workouts, completedIds]);
  const pickRandomIndex = (exclude = -1) => chooseRandomWorkoutIndex(workouts, completedIds, exclude);
  useEffect(() => {
    if (workouts.length && selectedIndex < 0) setSelectedIndex(pickRandomIndex());
  }, [workouts.length, history.length]);
  const currentIndex = selectedIndex >= 0 && workouts[selectedIndex] && !completedIds.has(workouts[selectedIndex].id) ? selectedIndex : (selectedIndex >= 0 && nextPendingIndex >= 0 ? nextPendingIndex : -1);
  const current = currentIndex >= 0 ? workouts[currentIndex] : undefined;
  const refresh = () => {
    void utils.workouts.list.invalidate();
    void utils.workouts.history.invalidate();
  };
  const session = trpc.workouts.session.useMutation({
    onSuccess: (_history, variables) => {
      refresh();
      setSelectedIndex(pickRandomIndex(currentIndex));
      toast.success(variables.action === "completed" ? "Sessão concluída" : "Workout pulado");
    },
  });
  const update = trpc.workouts.update.useMutation({ onSuccess: () => { refresh(); setEditingWorkout(null); toast.success("Workout atualizado"); } });
  const create = trpc.workouts.create.useMutation({
    onSuccess: () => {
      refresh();
      setShowCreate(false);
      setPendingImport(null);
      setNewWorkout({ title: "", focus: "", level: "", suggestedDate: "", notes: "" });
      toast.success("Workout adicionado");
    },
  });
  const remove = trpc.workouts.remove.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Workout removido");
    },
  });
  const reorder = trpc.workouts.reorder.useMutation({ onSuccess: refresh });
  const exportPdf = trpc.workouts.exportPdf.useMutation({
    onSuccess: result => {
      // Sem endpoint de download direto: o PDF chega em base64 pelo tRPC e vira
      // um blob local, o que evita expor uma rota de arquivo sem sessão.
      const bytes = Uint8Array.from(atob(result.base64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado");
    },
    onError: error => toast.error(error.message),
  });
  // Cai no mesmo rascunho do import de PDF: o workout gerado é revisado e
  // editado antes de entrar na fila, nunca salvo direto.
  const generate = trpc.workouts.generate.useMutation({
    onSuccess: result => {
      setShowSurprise(false);
      setPendingImport(result.workout);
      toast.success("Workout gerado. Revise antes de salvar.");
    },
    onError: error => toast.error(error.message),
  });
  const importPdf = trpc.workouts.importPdf.useMutation({
    onSuccess: result => {
      setPendingImport(result.workout);
      toast.success("PDF convertido. Revise os dados antes de salvar.");
    },
    onError: error => toast.error(error.message),
  });

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f7f2]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e06b3c]" />
      </div>
    );
  if (!user) return <Landing />;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= workouts.length) return;
    const ids = workouts.map(item => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setSelectedIndex(target);
    reorder.mutate({ ids });
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Selecione um PDF");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    importPdf.mutate({ filename: file.name, mimeType: file.type, base64 });
  };

  return (
    <div className={`${getWorkoutShellClass(tab)} ${tab === "today" ? "workout-mode min-h-screen bg-[#f7f7f2] text-[#20231f]" : "min-h-screen bg-[#f7f7f2] text-[#20231f]"}`} data-workout-mode={tab === "today" ? "locked" : "standard"}>
      <header className="sticky top-0 z-30 border-b border-[#dedfd6] bg-[#f7f7f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#20231f] text-[#f7f7f2]">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e06b3c]">
                MOVEMENT / LOG
              </p>
              <h1 className="font-display text-xl font-semibold leading-none">
                Workout Sequencer
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[#6d746a] sm:block">
              {user.name || "Atleta"}
            </span>
            <Button
              aria-label="Sair"
              variant="ghost"
              size="icon"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className={tab === "today" ? "workout-mode-main mx-auto flex min-h-0 max-w-6xl flex-col px-4 py-3 sm:px-6 sm:py-10" : "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"}>
        <div className="workout-dashboard-chrome workout-intro mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-[#e06b3c]">
              Seu ritmo, sua sequência
            </p>
            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Treinar é aparecer.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6d746a]">
              Uma fila viva para manter consistência sem transformar o treino em
              burocracia.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-[#e06b3c] text-white hover:bg-[#c8562c]"
              onClick={() => setShowSurprise(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              WOD surpresa
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo workout
            </Button>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importPdf.isPending}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importPdf.isPending ? "Lendo PDF…" : "Importar PDF"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={event => {
                void importFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
        <Tabs
          value={tab}
          onKeyDown={event => { if (tab === "today" && (event.key === "PageDown" || event.key === "PageUp")) event.preventDefault(); }}
          onValueChange={value => setTab(value as Tab)}
          className="workout-dashboard-chrome mb-6"
        >
          <TabsList className="h-11 bg-[#e9eae2] p-1">
            <TabsTrigger
              value="today"
              className="gap-2 data-[state=active]:bg-white"
            >
              <Sparkles className="h-4 w-4" />
              Hoje
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="gap-2 data-[state=active]:bg-white"
            >
              Sequência
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-2 data-[state=active]:bg-white"
            >
              <HistoryIcon className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "today" && (
            <Today
            workouts={workouts}
            current={current}
            index={currentIndex}
            setIndex={setSelectedIndex}
            onNextRandom={() => setSelectedIndex(pickRandomIndex(currentIndex))}
            completedIds={completedIds}
            onExit={() => setTab("library")}
            onSession={(action: "completed" | "skipped") =>
              current && session.mutate({ id: current.id, action })
            }
            loading={workoutsQuery.isLoading || historyQuery.isLoading}
          />
        )}
        {tab === "library" && (
          <Library
            workouts={workouts}
            completedIds={completedIds}
            onMove={move}
            onEdit={(workout: any) => setEditingWorkout({ id: workout.id, title: workout.title, focus: workout.focus || "", level: workout.level || "", suggestedDate: workout.suggestedDate ? new Date(workout.suggestedDate).toISOString().slice(0, 10) : "", notes: workout.notes || "", sections: workout.sections || [] })}
            onDelete={(id: number) => {
              if (confirm("Excluir este workout?")) remove.mutate({ id });
            }}
            onSelect={(index: number) => {
              setSelectedIndex(index);
              setTab("today");
            }}
            onExportPdf={(id: number) => exportPdf.mutate({ id })}
            exportingId={exportPdf.isPending ? exportPdf.variables?.id : undefined}
          />
        )}
        {tab === "history" && <History items={history} />}
        {showSurprise && (
          <SurpriseWodDialog
            busy={generate.isPending}
            onClose={() => setShowSurprise(false)}
            onGenerate={selection => generate.mutate(selection)}
          />
        )}
        {(showCreate || editingWorkout || pendingImport) && (
          <CreateWorkout
            value={editingWorkout || pendingImport || newWorkout}
            setValue={editingWorkout ? setEditingWorkout : pendingImport ? setPendingImport : setNewWorkout}
            busy={create.isPending || update.isPending}
            onClose={() => { setShowCreate(false); setEditingWorkout(null); setPendingImport(null); }}
            onCreate={() => editingWorkout ? update.mutate({ id: editingWorkout.id, data: { title: editingWorkout.title, focus: editingWorkout.focus, level: editingWorkout.level, suggestedDate: editingWorkout.suggestedDate ? new Date(editingWorkout.suggestedDate) : undefined, notes: editingWorkout.notes, sections: editingWorkout.sections || [] } }) : create.mutate({ ...(pendingImport || newWorkout), suggestedDate: (pendingImport || newWorkout).suggestedDate ? new Date((pendingImport || newWorkout).suggestedDate) : undefined, sections: (pendingImport || newWorkout).sections || [], sourceFileKey: pendingImport?.sourceFileKey, sourceFileName: pendingImport?.sourceFileName })}
          />
        )}
      </main>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[#20231f] px-6 py-8 text-[#f7f7f2]">
      <div className="mx-auto flex min-h-[90vh] max-w-xl flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e06b3c]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="font-display text-xl">Workout Sequencer</span>
        </div>
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.22em] text-[#f29a73]">
            Personal training log
          </p>
          <h1 className="font-display text-6xl font-semibold leading-[0.92] tracking-[-0.06em] sm:text-8xl">
            Treine.
            <br />
            <span className="text-[#f29a73]">Registre.</span>
            <br />
            Continue.
          </h1>
          <p className="mt-8 max-w-md text-base leading-7 text-[#bfc7ba]">
            Seus workouts, na ordem certa, com o detalhe necessário para
            executar bem e voltar amanhã.
          </p>
          <Button
            onClick={() => startLogin()}
            className="mt-8 bg-[#e06b3c] px-6 text-white hover:bg-[#c8562c]"
          >
            <Github className="mr-2 h-4 w-4" />
            Entrar com GitHub
          </Button>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#7e877c]">
          Mobile-first / Personal / Consistent
        </p>
      </div>
    </div>
  );
}

type ActiveTimer = { label: string; total: number; remaining: number; status: TimerStatus; hidden?: boolean };

function Today({
  workouts,
  current,
  index,
  setIndex,
  onNextRandom,
  completedIds,
  onExit,
  onSession,
  loading,
}: any) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [timer, setTimer] = useState<ActiveTimer | null>(null);

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const id = window.setInterval(() => {
      setTimer(prev => {
        if (!prev || prev.status !== "running") return prev;
        const remaining = prev.remaining - 1;
        if (remaining > 0) return { ...prev, remaining };
        signalTimerEnd();
        return { ...prev, remaining: 0, status: "finished" };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer?.status, timer?.label]);

  // Tenta o relógio do sistema primeiro (só o Android expõe isso para a web).
  // Se a página continuar visível depois do intent, ele não foi atendido e o
  // timer interno assume — que é o caminho normal no iOS e no desktop.
  const startTimer = (label: string, seconds: number) => {
    const fallback = () => setTimer({ label, total: seconds, remaining: seconds, status: "running" });

    if (isAndroid(navigator.userAgent)) {
      window.location.href = buildAndroidTimerIntent(seconds, label);
      window.setTimeout(() => {
        if (document.visibilityState === "visible") fallback();
      }, 1200);
      return;
    }
    fallback();
  };

  // Um toque fecha. Se ainda havia tempo, o timer é pausado e continua
  // disponível para retomar — um toque acidental no meio do treino não pode
  // custar a contagem. Se já terminou, some de vez.
  const onTimerClick = () => {
    setTimer(prev => {
      if (!prev) return null;
      if (getTimerClickAction(prev.status) === "close") return null;
      return { ...prev, status: "paused", hidden: true };
    });
  };

  const resumeTimer = () =>
    setTimer(prev => (prev ? { ...prev, status: "running", hidden: false } : prev));
  // "Sem workout" e "ainda carregando" são estados diferentes. Mostrar o vazio
  // durante o carregamento dizia ao usuário logado que ele não tem treinos.
  if (!current && loading)
    return (
      <Card className="border-dashed bg-white/50">
        <CardContent className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#e06b3c]" />
          <p className="mt-3 text-sm text-[#6d746a]">Carregando seu treino…</p>
        </CardContent>
      </Card>
    );
  if (!current)
    return (
      <Card className="border-dashed bg-white/50 p-10 text-center">
        <CardContent className="py-16 text-center">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-[#e06b3c]" />
          <h3 className="font-display text-2xl font-semibold">
            Sua sequência começa aqui
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6d746a]">
            Importe um PDF ou adicione seu primeiro workout para montar sua fila
            pessoal.
          </p>
        </CardContent>
      </Card>
    );
  const expandedExerciseData = current.sections?.flatMap((section: any) => section.exercises || []).find((exercise: any) => String(exercise.id) === expandedExercise);
  const demoState = getWorkoutDemoState(Boolean(expandedExerciseData));
  return (
    <div className="workout-session-screen">
      <div className="workout-session-toolbar">
        <Button type="button" variant="ghost" size="sm" className="workout-session-back" onClick={onExit} aria-label="Voltar para a sequência">
          <ChevronLeft className="mr-1 h-4 w-4" /> Sequência
        </Button>
        <span className="workout-session-status" aria-live="polite">
          <span className="workout-session-label">Treino em execução</span>
          <span className="workout-session-counter">
            Workout {index + 1} de {workouts.length} · {completedIds.size} concluídos
          </span>
        </span>
      </div>
      <div className="workout-today-grid grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <section>
        <Card className="workout-card overflow-hidden border-0 bg-[#20231f] text-[#f7f7f2] shadow-[0_18px_60px_rgba(32,35,31,0.16)]">
          <CardHeader>
            <Badge className="mb-4 w-fit border-0 bg-[#e06b3c] text-white">
              PRÓXIMO DA FILA
            </Badge>
            <CardTitle className="workout-card-title font-display text-2xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              {current.title}
            </CardTitle>
            <p className="mt-3 text-sm leading-6 text-[#bfc7ba]">
              {current.focus || "Sessão de movimento e condicionamento."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-[#4c554b] text-[#d7ddd3]"
              >
                {current.level || "Nível livre"}
              </Badge>
              <Badge
                variant="outline"
                className="border-[#4c554b] text-[#d7ddd3]"
              >
                <Clock3 className="mr-1 h-3 w-3" />
                {dateLabel(current.suggestedDate)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="workout-card-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7f7f2] p-4 text-[#20231f] overscroll-contain sm:p-6">
            {current.sections?.map((section: any) => (
              <section
                key={section.id}
                className="rounded-2xl border border-[#dedfd6] bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.format && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e06b3c]">
                      {section.format}
                    </span>
                  )}
                </div>
                {section.exercises?.map((exercise: any) => (
                  <div
                    key={exercise.id}
                    className="workout-exercise-row border-t border-[#ecece6] py-3 first:border-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="workout-exercise-main min-w-0">
                        <p className="font-medium">{exercise.name}</p>
                        <p className="workout-exercise-prescription mt-1 text-sm leading-5 text-[#6d746a]">
                          {exercise.prescription ||
                            [exercise.sets, exercise.reps, exercise.duration, exercise.load]
                              .filter(Boolean)
                              .join(" · ")}
                        </p>
                      </div>
                      {(() => {
                        const seconds = parseDurationToSeconds(exercise.duration, exercise.prescription);
                        if (!seconds) return null;
                        const isPaused = timer?.label === exercise.name && timer?.status === "paused";
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="workout-exercise-timer shrink-0 px-2 text-xs font-semibold text-[#20231f] hover:bg-[#e9eae2]"
                            aria-label={`${isPaused ? "Retomar" : "Iniciar"} timer de ${formatTimerDisplay(seconds)} para ${exercise.name}`}
                            onClick={() => (isPaused ? resumeTimer() : startTimer(exercise.name, seconds))}
                          >
                            <TimerIcon className="mr-1 h-3.5 w-3.5" />
                            {isPaused ? "Retomar" : "Iniciar"}
                          </Button>
                        );
                      })()}
                      {getExerciseDemo(exercise.name) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="workout-exercise-demo shrink-0 px-2 text-xs text-[#e06b3c] hover:bg-[#f4e4dd]"
                          aria-expanded={expandedExercise === String(exercise.id)}
                          aria-label={`Ver demonstração de ${exercise.name}`}
                          onClick={() => setExpandedExercise(expandedExercise === String(exercise.id) ? null : String(exercise.id))}
                        >
                          <span className="sm:hidden">
                            {expandedExercise === String(exercise.id) ? "Ocultar" : "Ver"}
                          </span>
                          <span className="hidden sm:inline">
                            {expandedExercise === String(exercise.id) ? "Ocultar" : "Ver demonstração"}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {section.notes && (
                  <p className="workout-notes mt-3 rounded-xl bg-[#f1f1eb] p-3 text-xs leading-5 text-[#6d746a]">
                    {section.notes}
                  </p>
                )}
              </section>
            ))}
            {current.notes && (
              <p className="workout-notes px-1 text-sm leading-6 text-[#6d746a]">
                {current.notes}
              </p>
            )}
          </CardContent>
          <div className="workout-card-actions flex flex-row items-center gap-2 border-t border-[#3f463e] bg-[#20231f] p-4">
            <Button
              className="flex-1 bg-[#e06b3c] text-white hover:bg-[#c8562c]"
              disabled={completedIds.has(current.id)}
              onClick={() => onSession("completed")}
            >
              <Check className="mr-2 h-4 w-4" />
              <span className="sm:hidden">
                {completedIds.has(current.id) ? "Concluído" : "Concluir"}
              </span>
              <span className="hidden sm:inline">
                {completedIds.has(current.id)
                  ? "Concluído"
                  : "Marcar como concluído"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="shrink-0 border-[#4c554b] bg-transparent text-[#f7f7f2] hover:bg-white/10"
              onClick={() => onSession("skipped")}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Pular
            </Button>
            <Button
              variant="ghost"
              className="shrink-0 text-[#f7f7f2] hover:bg-white/10"
              aria-label="Sortear e abrir outro workout"
              onClick={onNextRandom}
            >
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>
      <aside className="hidden" aria-hidden="true">
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl">Sua fila</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workouts.map((workout: any, itemIndex: number) => (
              <button
                key={workout.id}
                onClick={() => setIndex(itemIndex)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${itemIndex === index ? "bg-[#f0e4dc]" : "hover:bg-[#f4f4ef]"}`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${completedIds.has(workout.id) ? "bg-[#20231f] text-white" : "bg-[#e9eae2] text-[#6d746a]"}`}
                >
                  {completedIds.has(workout.id) ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    String(itemIndex + 1).padStart(2, "0")
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {workout.title}
                </span>
                <ChevronRight className="h-4 w-4 text-[#a0a89c]" />
              </button>
            ))}
          </CardContent>
        </Card>
      </aside>
      {timer && !timer.hidden && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#20231f]/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Timer de ${timer.label}`}
          onClick={onTimerClick}
        >
          <div className="text-center text-[#f7f7f2]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f29a73]">
              {timer.status === "finished" ? "Tempo encerrado" : timer.label}
            </p>
            <p
              className="font-display text-[22vw] font-semibold leading-none tabular-nums sm:text-[9rem]"
              aria-live="polite"
            >
              {formatTimerDisplay(timer.remaining)}
            </p>
            <p className="mt-4 text-sm text-[#bfc7ba]">
              {timer.status === "finished" ? "Toque para fechar" : "Toque para pausar e fechar"}
            </p>
          </div>
        </div>
      )}
      {expandedExerciseData && getExerciseDemo(expandedExerciseData.name) && (
        <div className={`${demoState.modalClass} grid place-items-center bg-[#20231f]/70 p-4`} role="presentation" onClick={() => setExpandedExercise(null)}>
          <div className="max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-[#f7f7f2] p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label={`Demonstração de ${expandedExerciseData.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e06b3c]">Demonstração</p>
                <h3 className="font-display text-xl font-semibold">{expandedExerciseData.name}</h3>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar demonstração" onClick={() => setExpandedExercise(null)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="rounded-2xl bg-[#f1f1eb] p-3">
              <img src={getExerciseDemo(expandedExerciseData.name)} alt={`Demonstração de ${expandedExerciseData.name}`} className="mx-auto h-56 w-full object-contain" loading="lazy" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6d746a]">Use a ilustração como referência visual e priorize controle, amplitude confortável e execução segura.</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function Library({ workouts, completedIds, onMove, onEdit, onDelete, onSelect, onExportPdf, exportingId }: any) {
  return (
    <div className="space-y-3">
      {workouts.map((workout: any, index: number) => (
        <Card key={workout.id} className="border-[#dedfd6] bg-white">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9eae2] text-sm font-semibold text-[#6d746a]">
              {String(index + 1).padStart(2, "0")}
            </div>
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelect(index)}
            >
              <p className="truncate font-semibold">{workout.title}</p>
              <p className="mt-1 truncate text-sm text-[#6d746a]">
                {workout.focus || "Sem foco definido"}
              </p>
            </button>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="mr-2 hidden sm:inline-flex">
                {completedIds.has(workout.id)
                  ? "Concluído"
                  : dateLabel(workout.suggestedDate)}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => onEdit(workout)}>Editar</Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onExportPdf(workout.id)}
                disabled={exportingId === workout.id}
                aria-label={`Baixar ${workout.title} em PDF`}
              >
                {exportingId === workout.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                aria-label="Mover para cima"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove(index, 1)}
                disabled={index === workouts.length - 1}
                aria-label="Mover para baixo"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#b14a35]"
                onClick={() => onDelete(workout.id)}
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function History({ items }: any) {
  const [openId, setOpenId] = useState<number | null>(null);
  if (!items.length)
    return (
      <Card className="border-dashed bg-white/60">
        <CardContent className="py-16 text-center text-sm text-[#6d746a]">Ainda não há sessões registradas.</CardContent>
      </Card>
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item: any) => (
        <Card key={item.session.id} className="border-[#dedfd6] bg-white">
          <CardContent className="p-4">
            <button className="flex w-full items-center gap-4 text-left" onClick={() => setOpenId(openId === item.session.id ? null : item.session.id)}>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.session.action === "completed" ? "bg-[#e0eee0] text-[#47704b]" : "bg-[#f4e4dd] text-[#b14a35]"}`}>{item.session.action === "completed" ? <Check className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />}</div>
              <div><p className="font-semibold">{item.workout?.title || "Workout removido"}</p><p className="mt-1 text-xs text-[#6d746a]">{item.session.action === "completed" ? "Concluído" : "Pulado"} · {new Date(item.session.performedAt).toLocaleString("pt-BR")}</p></div>
            </button>
            {openId === item.session.id && item.session.snapshot && <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-[#f1f1eb] p-3 text-[11px] leading-5 text-[#6d746a]">{item.session.snapshot}</pre>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateWorkout({ value, setValue, busy, onClose, onCreate }: any) {
  const sections = value.sections || [];
  const setSections = (next: any[]) => setValue({ ...value, sections: next });
  const invalid = sections.some((section: any) => !section.title?.trim() || (section.exercises || []).some((exercise: any) => !exercise.name?.trim() || (!exercise.prescription?.trim() && !exercise.sets && !exercise.reps && !exercise.duration && !exercise.load)));
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#20231f]/50 p-0 sm:place-items-center sm:p-6">
      <Card className="w-full max-w-lg rounded-b-none border-0 bg-[#f7f7f2] sm:rounded-2xl">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e06b3c]">
              Novo item
            </p>
            <CardTitle className="font-display text-2xl">
              Adicionar workout
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Nome</Label>
            <Input
              id="title"
              value={value.title}
              onChange={event =>
                setValue({ ...value, title: event.target.value })
              }
              placeholder="Ex.: Engine / Base aeróbica"
            />
          </div>
          <div>
            <Label htmlFor="focus">Foco</Label>
            <Input
              id="focus"
              value={value.focus}
              onChange={event =>
                setValue({ ...value, focus: event.target.value })
              }
              placeholder="Ex.: condicionamento e core"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="level">Nível</Label>
              <Input id="level" value={value.level || ""} onChange={event => setValue({ ...value, level: event.target.value })} placeholder="Ex.: intermediário" />
            </div>
            <div>
              <Label htmlFor="suggestedDate">Data sugerida</Label>
              <Input id="suggestedDate" type="date" value={value.suggestedDate || ""} onChange={event => setValue({ ...value, suggestedDate: event.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={value.notes}
              onChange={event =>
                setValue({ ...value, notes: event.target.value })
              }
              placeholder="Notas gerais da sessão"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Seções e exercícios</Label><Button type="button" variant="outline" size="sm" onClick={() => setSections([...sections, { title: "Nova seção", format: "", notes: "", exercises: [] }])}><Plus className="mr-1 h-3 w-3" />Seção</Button></div>
            {sections.map((section: any, sectionIndex: number) => <div key={sectionIndex} className="rounded-xl border border-[#dedfd6] bg-white p-3 space-y-3"><div className="flex gap-2"><Input value={section.title || ""} onChange={event => { const next = [...sections]; next[sectionIndex] = { ...section, title: event.target.value }; setSections(next); }} placeholder="Nome da seção" /><Button type="button" variant="ghost" size="icon" disabled={sectionIndex === 0} onClick={() => { const next = [...sections]; [next[sectionIndex - 1], next[sectionIndex]] = [next[sectionIndex], next[sectionIndex - 1]]; setSections(next); }}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={sectionIndex === sections.length - 1} onClick={() => { const next = [...sections]; [next[sectionIndex], next[sectionIndex + 1]] = [next[sectionIndex + 1], next[sectionIndex]]; setSections(next); }}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="text-[#b14a35]" onClick={() => setSections(sections.filter((_: any, index: number) => index !== sectionIndex))}><Trash2 className="h-4 w-4" /></Button></div><Input value={section.format || ""} onChange={event => { const next = [...sections]; next[sectionIndex] = { ...section, format: event.target.value }; setSections(next); }} placeholder="Formato (ex.: EMOM, AMRAP, força)" />{(section.exercises || []).map((exercise: any, exerciseIndex: number) => <div key={exerciseIndex} className="rounded-lg bg-[#f1f1eb] p-3 space-y-2"><div className="flex gap-2"><Input value={exercise.name || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, name: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder="Exercício" /><Button type="button" variant="ghost" size="icon" disabled={exerciseIndex === 0} onClick={() => { const next = [...sections]; const exercises = [...(section.exercises || [])]; [exercises[exerciseIndex - 1], exercises[exerciseIndex]] = [exercises[exerciseIndex], exercises[exerciseIndex - 1]]; next[sectionIndex] = { ...section, exercises }; setSections(next); }}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={exerciseIndex === (section.exercises || []).length - 1} onClick={() => { const next = [...sections]; const exercises = [...(section.exercises || [])]; [exercises[exerciseIndex], exercises[exerciseIndex + 1]] = [exercises[exerciseIndex + 1], exercises[exerciseIndex]]; next[sectionIndex] = { ...section, exercises }; setSections(next); }}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => { const next = [...sections]; next[sectionIndex] = { ...section, exercises: section.exercises.filter((_: any, index: number) => index !== exerciseIndex) }; setSections(next); }}><Trash2 className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["sets","Séries"],["reps","Reps"],["duration","Tempo"],["load","Carga"]].map(([field, label]) => <Input key={field} value={exercise[field] || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, [field]: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder={label} />)}</div><Input value={exercise.prescription || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, prescription: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder="Prescrição / observação do exercício" /><Textarea value={exercise.notes || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, notes: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder="Notas do exercício" /></div>)}<Button type="button" variant="outline" size="sm" onClick={() => { const next = [...sections]; next[sectionIndex] = { ...section, exercises: [...(section.exercises || []), { name: "", prescription: "", sets: "", reps: "", duration: "", load: "", notes: "" }] }; setSections(next); }}><Plus className="mr-1 h-3 w-3" />Exercício</Button><Textarea value={section.notes || ""} onChange={event => { const next = [...sections]; next[sectionIndex] = { ...section, notes: event.target.value }; setSections(next); }} placeholder="Notas da seção" /></div>)}{invalid && <p className="text-xs text-[#b14a35]">Cada seção precisa de nome; cada exercício precisa de nome e prescrição ou ao menos uma métrica (séries, reps, tempo ou carga).</p>}</div>
          <Button
            className="w-full bg-[#e06b3c] text-white hover:bg-[#c8562c]"
            disabled={!value.title.trim() || busy || invalid}
            onClick={onCreate}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Salvar workout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
