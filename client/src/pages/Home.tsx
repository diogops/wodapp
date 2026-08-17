import { useAuth } from "@/_core/hooks/useAuth";
import { startGoogleLogin, startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SurpriseWodDialog } from "@/components/SurpriseWodDialog";
import { DraftWodPanel } from "@/components/DraftWodPanel";
import { SectionTitleSelect } from "@/components/SectionTitleSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKOUT_CATEGORIES } from "@shared/categories";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Dumbbell,
  FileUp,
  Github,
  LayoutGrid,
  History as HistoryIcon,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Rows3,
  SkipForward,
  Sparkles,
  Timer as TimerIcon,
  Trash2,
  Type,
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
  findNextExercise,
  formatTimerDisplay,
  getTimerClickAction,
  getTimerMode,
  isAndroid,
  parseDurationToSeconds,
  type TimerExercise,
  type TimerMode,
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

/**
 * Botão só de ícone com dica. O rótulo textual vira `aria-label` e tooltip —
 * no celular o tooltip não abre no toque, então o aria-label é o que sustenta
 * a acessibilidade, não um extra.
 */
function IconAction({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 ${className ?? ""}`}
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Botão de rótulo curto com a função completa na dica. Os rótulos são curtos
 * para os três caberem numa linha só no celular; o `title`/`aria-label` é o
 * que explica a ação, já que no toque o tooltip não abre.
 */
function HintButton({
  hint,
  onClick,
  disabled,
  className,
  variant,
  children,
}: {
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "outline";
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={variant}
          className={`shrink-0 px-2.5 ${className ?? ""}`}
          aria-label={hint}
          title={hint}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
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
  const [showDraft, setShowDraft] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [newWorkout, setNewWorkout] = useState({
    title: "",
    focus: "",
    level: "",
    category: "",
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
  const allWorkouts = workoutsQuery.data ?? [];
  // Filtro por categoria do atleta. Workout sem categoria continua visível:
  // os treinos que existiam antes da categorização não podem sumir da fila.
  const categoryMatches = useMemo(
    () =>
      user?.category
        ? allWorkouts.filter(workout => !workout.category || workout.category === user.category)
        : allWorkouts,
    [allWorkouts, user?.category]
  );
  // Se o filtro não sobrar nada, mostra tudo e avisa — ficar sem treino é pior
  // que ver um de outra categoria, mas o usuário precisa saber que isso ocorreu.
  const categoryFallback = Boolean(user?.category) && categoryMatches.length === 0 && allWorkouts.length > 0;
  const workouts = categoryFallback ? allWorkouts : categoryMatches;
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
    void utils.workouts.sectionTitles.invalidate();
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
      setNewWorkout({ title: "", focus: "", level: "", category: "", suggestedDate: "", notes: "" });
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
  const setCategory = trpc.workouts.setCategory.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      toast.success("Categoria atualizada");
    },
    onError: error => toast.error(error.message),
  });
  // UPDATE de verdade no servidor: renomear preserva o id e, com ele, o
  // histórico de sessões — ao contrário de `update`, que apaga e recria.
  const rename = trpc.workouts.rename.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Nome atualizado");
    },
    onError: error => toast.error(error.message),
  });
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
  const sectionTitlesQuery = trpc.workouts.sectionTitles.useQuery(undefined, { enabled: Boolean(user) });
  const draftQuery = trpc.workouts.draft.useQuery(undefined, { enabled: Boolean(user) });
  const draft = draftQuery.data ?? null;
  const refreshDraft = () => void utils.workouts.draft.invalidate();

  // O rascunho é persistido no servidor, então a proposta continua disponível
  // depois de fechar a aba — por isso ela vira notificação, não modal obrigatório.
  const generate = trpc.workouts.generate.useMutation({
    onSuccess: () => {
      setShowSurprise(false);
      setShowDraft(true);
      refreshDraft();
      toast.success("Workout proposto. Aceite, ajuste ou descarte.");
    },
    onError: error => toast.error(error.message),
  });
  const reviseDraft = trpc.workouts.reviseDraft.useMutation({
    onSuccess: () => {
      refreshDraft();
      toast.success("Workout refeito com o seu ajuste");
    },
    onError: error => toast.error(error.message),
  });
  const acceptDraft = trpc.workouts.acceptDraft.useMutation({
    onSuccess: (created, variables) => {
      refresh();
      refreshDraft();
      setShowDraft(false);
      if (variables.startNow && created) {
        setTab("today");
        setSelectedIndex(0);
      }
      toast.success(variables.startNow ? "Bora treinar" : "Salvo na sua grade");
    },
    onError: error => toast.error(error.message),
  });
  const discardDraft = trpc.workouts.discardDraft.useMutation({
    onSuccess: () => {
      refreshDraft();
      setShowDraft(false);
      toast.success("Proposta descartada");
    },
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
      <header className="app-header sticky top-0 z-30 border-b border-[#dedfd6] bg-[#f7f7f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:px-6">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl text-left"
            aria-label="Voltar para o treino de hoje"
            onClick={() => setTab("today")}
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#20231f] text-[#f7f7f2]">
              <Dumbbell className="h-4 w-4" />
            </div>
            <h1 className="font-display text-base font-semibold leading-none">
              Workout Sequencer
            </h1>
          </button>
          <div className="flex items-center gap-2">
            {draft && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Você tem um workout proposto pela IA"
                onClick={() => setShowDraft(true)}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e06b3c]" />
              </Button>
            )}
            <Select
              value={user.category ?? undefined}
              onValueChange={value => setCategory.mutate({ category: value })}
            >
              <SelectTrigger
                className="h-8 w-[9.5rem] border-[#dedfd6] bg-white text-xs"
                aria-label="Sua categoria"
              >
                <SelectValue placeholder="Sua categoria" />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      {/* Folga inferior fora do modo de treino: sem ela o último card fica
          embaixo do rodapé fixo e não há como alcançá-lo. */}
      <main className={tab === "today" ? "workout-mode-main mx-auto flex min-h-0 max-w-6xl flex-col px-4 py-3 sm:px-6 sm:py-10" : "mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6 sm:pt-10"}>
        {/* Intro enxuta: na Sequência ela ficava entre o cabeçalho e os cards,
            empurrando a lista para baixo sem acrescentar informação. */}
        <div className="workout-dashboard-chrome workout-intro mb-4">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Treinar é aparecer.
          </h2>
        </div>
        <Tabs
          value={tab}
          onKeyDown={event => { if (tab === "today" && (event.key === "PageDown" || event.key === "PageUp")) event.preventDefault(); }}
          onValueChange={value => setTab(value as Tab)}
          className="workout-dashboard-chrome mb-6"
        >
          <TabsList className="mx-auto flex h-11 w-fit bg-[#e9eae2] p-1">
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
        {categoryFallback && (
          <p className="workout-dashboard-chrome mb-3 rounded-xl bg-[#f4e4dd] px-3 py-2 text-xs leading-5 text-[#8a4a2f]">
            Nenhum workout na categoria {user.category}. Mostrando todos para você não ficar sem treino.
          </p>
        )}
        {tab === "today" && (
            <Today
            workouts={workouts}
            current={current}
            index={currentIndex}
            setIndex={setSelectedIndex}
            onNextRandom={() => setSelectedIndex(pickRandomIndex(currentIndex))}
            completedIds={completedIds}
            onExit={() => setTab("library")}
            onSession={(action: "completed" | "skipped", durationSeconds?: number) =>
              current && session.mutate({ id: current.id, action, durationSeconds })
            }
            loading={workoutsQuery.isLoading || historyQuery.isLoading}
          />
        )}
        {tab === "library" && (
          <Library
            workouts={workouts}
            completedIds={completedIds}
            onMove={move}
            onEdit={(workout: any) => setEditingWorkout({ id: workout.id, title: workout.title, focus: workout.focus || "", level: workout.level || "", category: workout.category || "", suggestedDate: workout.suggestedDate ? new Date(workout.suggestedDate).toISOString().slice(0, 10) : "", notes: workout.notes || "", sections: workout.sections || [] })}
            onDelete={(id: number) => {
              if (confirm("Excluir este workout?")) remove.mutate({ id });
            }}
            onSelect={(index: number) => {
              setSelectedIndex(index);
              setTab("today");
            }}
            onRename={(id: number, title: string) => rename.mutate({ id, title })}
            onExportPdf={(id: number) => exportPdf.mutate({ id })}
            exportingId={exportPdf.isPending ? exportPdf.variables?.id : undefined}
          />
        )}
        {tab === "history" && <History items={history} />}
        {draft && showDraft && (
          <DraftWodPanel
            draft={draft}
            busy={reviseDraft.isPending || acceptDraft.isPending || discardDraft.isPending}
            onClose={() => setShowDraft(false)}
            onAccept={(startNow: boolean) => acceptDraft.mutate({ startNow })}
            onDiscard={() => discardDraft.mutate()}
            onRevise={(changeRequest: string) => reviseDraft.mutate({ changeRequest })}
          />
        )}
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
            sectionTitleOptions={sectionTitlesQuery.data ?? []}
            onClose={() => { setShowCreate(false); setEditingWorkout(null); setPendingImport(null); }}
            onCreate={() => editingWorkout ? update.mutate({ id: editingWorkout.id, data: { title: editingWorkout.title, focus: editingWorkout.focus, level: editingWorkout.level, category: editingWorkout.category || undefined, suggestedDate: editingWorkout.suggestedDate ? new Date(editingWorkout.suggestedDate) : undefined, notes: editingWorkout.notes, sections: editingWorkout.sections || [] } }) : create.mutate({ ...(pendingImport || newWorkout), category: (pendingImport || newWorkout).category || undefined, suggestedDate: (pendingImport || newWorkout).suggestedDate ? new Date((pendingImport || newWorkout).suggestedDate) : undefined, sections: (pendingImport || newWorkout).sections || [], sourceFileKey: pendingImport?.sourceFileKey, sourceFileName: pendingImport?.sourceFileName })}
          />
        )}
      </main>
      {/* Ações de criação no rodapé, fixas. `workout-dashboard-chrome` as
          esconde no modo de treino, onde o rodapé pertence ao workout. */}
      <footer className="workout-dashboard-chrome fixed inset-x-0 bottom-0 z-30 border-t border-[#dedfd6] bg-[#f7f7f2]/95 backdrop-blur-xl">
        {/* Folga generosa embaixo: soma-se ao safe-area do iOS para os botões
            não encostarem na barra de gestos nem na barra do navegador, que
            aparece e some conforme a rolagem. */}
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-1.5 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
            {/* Uma linha só: com os rótulos longos os três quebravam em duas
                no celular. A função completa vive na dica de cada botão. */}
            <div className="flex flex-nowrap items-center gap-1.5">
              <HintButton
                hint="Gerar um WOD com a IA"
                className="bg-[#e06b3c] text-white hover:bg-[#c8562c]"
                onClick={() => setShowSurprise(true)}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                WOD surpresa
              </HintButton>
              <HintButton
                hint="Criar um workout manualmente"
                variant="outline"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Novo
              </HintButton>
              <HintButton
                hint="Importar um workout de um arquivo PDF"
                variant="outline"
                disabled={importPdf.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {importPdf.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-1.5 h-4 w-4" />
                )}
                PDF
              </HintButton>
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
      </footer>
    </div>
  );
}

function Landing() {
  return (
    <div className="app-safe-top min-h-screen bg-[#20231f] px-6 py-8 text-[#f7f7f2]">
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
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => startGoogleLogin()}
              className="bg-[#e06b3c] px-6 text-white hover:bg-[#c8562c]"
            >
              <Mail className="mr-2 h-4 w-4" />
              Entrar com Google
            </Button>
            <Button
              onClick={() => startLogin()}
              variant="outline"
              className="border-[#4c554b] bg-transparent px-6 text-[#f7f7f2] hover:bg-white/10"
            >
              <Github className="mr-2 h-4 w-4" />
              Entrar com GitHub
            </Button>
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#7e877c]">
          Mobile-first / Personal / Consistent
        </p>
      </div>
    </div>
  );
}

type ActiveTimer = {
  exerciseId: string;
  label: string;
  mode: TimerMode;
  total: number;
  value: number;
  status: TimerStatus;
  hidden?: boolean;
};

const DONE_STORAGE_PREFIX = "wodapp:done:";

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
  const [doneExercises, setDoneExercises] = useState<Set<string>>(new Set());
  // Cronômetro do WOD inteiro: começa no primeiro "Iniciar" e é o que vai para
  // o histórico. Guardado como timestamp para sobreviver a re-render e à aba
  // ficar em segundo plano, onde setInterval não é confiável.
  const [wodStartedAt, setWodStartedAt] = useState<number | null>(null);
  const [wodElapsed, setWodElapsed] = useState<number | null>(null);

  // Sequência achatada do workout: é ela que define qual é o "próximo".
  const flatExercises: TimerExercise[] = useMemo(
    () =>
      (current?.sections ?? []).flatMap((section: any) =>
        (section.exercises ?? []).map((exercise: any) => ({
          id: String(exercise.id),
          name: exercise.name,
          seconds: parseDurationToSeconds(exercise.duration, exercise.prescription),
        }))
      ),
    [current]
  );

  // Concluídos vivem em localStorage por workout: fechar o app no meio do
  // treino não pode apagar o que já foi feito, e isso não merece uma tabela.
  const doneStorageKey = current ? `${DONE_STORAGE_PREFIX}${current.id}` : null;

  useEffect(() => {
    if (!doneStorageKey) return;
    try {
      const raw = localStorage.getItem(doneStorageKey);
      setDoneExercises(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setDoneExercises(new Set());
    }
  }, [doneStorageKey]);

  const markDone = (exerciseId: string) => {
    setDoneExercises(prev => {
      const next = new Set(prev).add(exerciseId);
      if (doneStorageKey) {
        try {
          localStorage.setItem(doneStorageKey, JSON.stringify([...next]));
        } catch {}
      }
      return next;
    });
  };

  const toggleDone = (exerciseId: string) => {
    setDoneExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      if (doneStorageKey) {
        try {
          localStorage.setItem(doneStorageKey, JSON.stringify([...next]));
        } catch {}
      }
      return next;
    });
  };

  useEffect(() => {
    if (wodStartedAt === null) return;
    const tick = () => setWodElapsed(Math.floor((Date.now() - wodStartedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [wodStartedAt]);

  // Trocar de workout zera a contagem: o tempo pertence à sessão daquele WOD.
  useEffect(() => {
    setWodStartedAt(null);
    setWodElapsed(null);
    setTimer(null);
  }, [current?.id]);

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const id = window.setInterval(() => {
      setTimer(prev => {
        if (!prev || prev.status !== "running") return prev;
        if (prev.mode === "stopwatch") return { ...prev, value: prev.value + 1 };
        const value = prev.value - 1;
        if (value > 0) return { ...prev, value };
        signalTimerEnd();
        return { ...prev, value: 0, status: "finished" };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer?.status, timer?.exerciseId]);

  // Contagem regressiva encerrada marca o exercício sozinha: se o tempo
  // prescrito acabou, ele foi feito.
  useEffect(() => {
    if (timer?.status === "finished") markDone(timer.exerciseId);
  }, [timer?.status, timer?.exerciseId]);

  const startTimer = (exercise: TimerExercise) => {
    const mode = getTimerMode(exercise.seconds);
    const seconds = exercise.seconds ?? 0;
    setWodStartedAt(prev => prev ?? Date.now());
    const open = () =>
      setTimer({
        exerciseId: exercise.id,
        label: exercise.name,
        mode,
        total: seconds,
        value: mode === "countdown" ? seconds : 0,
        status: "running",
      });

    // Só a contagem regressiva faz sentido no relógio do sistema, e só o
    // Android expõe isso para a web. Cronômetro fica sempre dentro do app.
    if (mode === "countdown" && isAndroid(navigator.userAgent)) {
      window.location.href = buildAndroidTimerIntent(seconds, exercise.name);
      window.setTimeout(() => {
        if (document.visibilityState === "visible") open();
      }, 1200);
      return;
    }
    open();
  };

  const nextExercise = timer ? findNextExercise(flatExercises, timer.exerciseId, doneExercises) : null;

  // Clique fora fecha. Enquanto corre, pausa antes de fechar — um toque
  // acidental no meio do treino não pode custar a contagem.
  const onBackdropClick = () => {
    setTimer(prev => {
      if (!prev) return null;
      if (getTimerClickAction(prev.status) === "close") return null;
      return { ...prev, status: "paused", hidden: true };
    });
  };

  const finishCurrent = () => {
    setTimer(prev => (prev ? { ...prev, status: "finished" } : prev));
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
      {/* Sem colunas: a fila lateral foi removida e a trilha vazia do grid
          deixava ~32% da tela morta à direita no desktop. */}
      <div className="workout-today-grid grid min-h-0 flex-1 gap-6">
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
                // O espaço que sobra é repartido em proporção ao número de
                // exercícios. Com flex-grow igual, uma seção de 1 exercício
                // reivindicava tanto quanto uma de 5 e virava um card vazio.
                style={{ flexGrow: Math.max(1, section.exercises?.length ?? 1) }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.format && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e06b3c]">
                      {section.format}
                    </span>
                  )}
                </div>
                {section.exercises?.map((exercise: any) => {
                  const exerciseId = String(exercise.id);
                  const seconds = parseDurationToSeconds(exercise.duration, exercise.prescription);
                  const done = doneExercises.has(exerciseId);
                  const paused = timer?.exerciseId === exerciseId && timer.status === "paused";
                  return (
                  <div
                    key={exercise.id}
                    className={`workout-exercise-row border-t border-[#ecece6] py-3 first:border-0 first:pt-0 ${done ? "opacity-55" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="workout-exercise-main min-w-0">
                        <p className={`font-medium ${done ? "line-through" : ""}`}>{exercise.name}</p>
                        <p className="workout-exercise-prescription mt-1 text-sm leading-5 text-[#6d746a]">
                          {exercise.prescription ||
                            [exercise.sets, exercise.reps, exercise.duration, exercise.load]
                              .filter(Boolean)
                              .join(" · ")}
                        </p>
                      </div>
                      {/* Ações alinhadas numa faixa de largura fixa: sem isso o
                          "Ver" dançava de linha para linha conforme o texto. */}
                      <div className="flex shrink-0 items-center justify-end gap-0.5">
                        <button
                          type="button"
                          aria-label={done ? `Desmarcar ${exercise.name}` : `Marcar ${exercise.name} como feito`}
                          aria-pressed={done}
                          onClick={() => toggleDone(exerciseId)}
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                            done
                              ? "border-[#20231f] bg-[#20231f] text-white"
                              : "border-[#c9cbc0] text-transparent hover:border-[#6d746a]"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="workout-exercise-timer w-[4.5rem] shrink-0 justify-center px-1 text-xs font-semibold text-[#20231f] hover:bg-[#e9eae2]"
                          aria-label={`${paused ? "Retomar" : "Iniciar"} timer de ${exercise.name}`}
                          onClick={() =>
                            paused
                              ? resumeTimer()
                              : startTimer({ id: exerciseId, name: exercise.name, seconds })
                          }
                        >
                          <TimerIcon className="mr-1 h-3.5 w-3.5" />
                          {paused ? "Voltar" : "Iniciar"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="workout-exercise-demo w-[2.6rem] shrink-0 justify-center px-1 text-xs text-[#e06b3c] hover:bg-[#f4e4dd]"
                          aria-expanded={expandedExercise === exerciseId}
                          aria-label={`Ver demonstração de ${exercise.name}`}
                          onClick={() => setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId)}
                        >
                          <span className="sm:hidden">
                            {expandedExercise === exerciseId ? "Ocultar" : "Ver"}
                          </span>
                          <span className="hidden sm:inline">
                            {expandedExercise === exerciseId ? "Ocultar" : "Ver demonstração"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
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
              onClick={() => onSession("completed", wodElapsed ?? undefined)}
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
              onClick={() => onSession("skipped", wodElapsed ?? undefined)}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Pular
            </Button>
          </div>
        </Card>
      </section>
      {timer && !timer.hidden && (
        // Faixa opaca ocupando metade da tela em vez de um véu translúcido de
        // tela cheia: com 80% de opacidade o treino continuava legível atrás e
        // o cronômetro parecia só sobreposto, sem virar o foco.
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Timer de ${timer.label}`}
          onClick={onBackdropClick}
        >
          <div
            className="flex h-[50dvh] w-full flex-col items-center justify-center bg-black/95 px-6 text-center text-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f29a73]">
              {timer.status === "finished" ? "Concluído" : timer.label}
              {timer.mode === "stopwatch" && timer.status !== "finished" ? " · cronômetro" : ""}
            </p>
            <p
              className="font-display text-[22vw] font-semibold leading-none tabular-nums text-white sm:text-[9rem]"
              aria-live="polite"
            >
              {formatTimerDisplay(timer.value)}
            </p>

            {timer.status === "finished" ? (
              nextExercise ? (
                // Encadeamento: tocar dentro leva ao próximo exercício, tocar
                // fora fecha. É o que permite executar o WOD inteiro sem sair
                // do timer.
                <Button
                  className="mt-5 bg-[#e06b3c] px-6 text-white hover:bg-[#c8562c]"
                  onClick={() => startTimer(nextExercise)}
                >
                  <ChevronRight className="mr-1 h-4 w-4" />
                  Próximo: {nextExercise.name}
                </Button>
              ) : (
                <p className="mt-5 text-sm text-white/70">
                  Último exercício do treino. Toque fora para fechar.
                </p>
              )
            ) : (
              <Button
                variant="outline"
                className="mt-5 border-white/30 bg-transparent px-6 text-white hover:bg-white/10"
                onClick={finishCurrent}
              >
                <Check className="mr-2 h-4 w-4" />
                Concluir exercício
              </Button>
            )}

            <p className="mt-4 text-xs text-white/50">
              {timer.status === "finished"
                ? "Toque fora para fechar"
                : "Toque fora para pausar e fechar"}
            </p>
            {wodElapsed !== null && (
              <p className="mt-2 text-xs tabular-nums text-white/40">
                Treino: {formatTimerDisplay(wodElapsed)}
              </p>
            )}
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

type LibraryView = "list" | "grid";

const VIEW_STORAGE_KEY = "wodapp:library-view";

function Library({ workouts, completedIds, onMove, onEdit, onDelete, onSelect, onExportPdf, onRename, exportingId }: any) {
  const [renaming, setRenaming] = useState<{ id: number; title: string } | null>(null);
  // Preferência de visualização persiste: trocar de aba ou recarregar não pode
  // devolver o usuário para o modo que ele não escolheu.
  const [view, setView] = useState<LibraryView>(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });

  const changeView = (next: LibraryView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {}
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-end gap-1">
        <IconAction
          label="Ver em lista"
          className={view === "list" ? "bg-[#e9eae2] text-[#20231f]" : ""}
          onClick={() => changeView("list")}
        >
          <Rows3 className="h-4 w-4" />
        </IconAction>
        <IconAction
          label="Ver em cards"
          className={view === "grid" ? "bg-[#e9eae2] text-[#20231f]" : ""}
          onClick={() => changeView("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </IconAction>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {workouts.map((workout: any, index: number) => {
            const done = completedIds.has(workout.id);
            return (
              <Card key={workout.id} className="gap-0 overflow-hidden border-[#dedfd6] bg-white py-0">
                <CardContent className="flex flex-col gap-1.5 p-2.5">
                  <button className="min-w-0 text-left" onClick={() => onSelect(index)}>
                    <div className="mb-1 flex items-center justify-between">
                      {/* Ícone no lugar do número: no card o estado do workout
                          comunica mais rápido que a posição na fila. */}
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-lg ${
                          done ? "bg-[#20231f] text-[#f7f7f2]" : "bg-[#f0e4dc] text-[#e06b3c]"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                      </span>
                      <span className="text-[10px] font-bold tracking-widest text-[#a0a89c]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    {/* Duas linhas de título definem a altura do card e mantêm
                        a grade alinhada mesmo com nomes de tamanhos diferentes. */}
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">
                      {workout.title}
                    </p>
                    <p className="truncate text-xs text-[#6d746a]">
                      {workout.focus || "Sem foco definido"}
                    </p>
                  </button>
                  <div className="flex items-center justify-between border-t border-[#ecece6] pt-1">
                    <IconAction
                      label="Renomear"
                      className="h-8 w-8"
                      onClick={() => setRenaming({ id: workout.id, title: workout.title })}
                    >
                      <Type className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction label="Editar" className="h-8 w-8" onClick={() => onEdit(workout)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label="Baixar em PDF"
                      className="h-8 w-8"
                      disabled={exportingId === workout.id}
                      onClick={() => onExportPdf(workout.id)}
                    >
                      {exportingId === workout.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </IconAction>
                    <IconAction
                      label="Mover para cima"
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => onMove(index, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label="Mover para baixo"
                      className="h-8 w-8"
                      disabled={index === workouts.length - 1}
                      onClick={() => onMove(index, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label="Excluir"
                      className="h-8 w-8 text-[#b14a35]"
                      onClick={() => onDelete(workout.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconAction>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {workouts.map((workout: any, index: number) => (
            <Card key={workout.id} className="gap-0 border-[#dedfd6] bg-white py-0">
              {/* Linha única em qualquer largura: empilhar no celular dobrava a
                  altura de cada card sem ganhar legibilidade. */}
              <CardContent className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9eae2] text-sm font-semibold text-[#6d746a]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(index)}>
                  <p className="truncate text-base font-semibold leading-snug">{workout.title}</p>
                  <p className="truncate text-sm leading-snug text-[#6d746a]">
                    {completedIds.has(workout.id) ? "Concluído · " : ""}
                    {workout.focus || "Sem foco definido"}
                  </p>
                </button>
                <div className="flex shrink-0 items-center">
                  <IconAction
                    label="Renomear"
                    onClick={() => setRenaming({ id: workout.id, title: workout.title })}
                  >
                    <Type className="h-4 w-4" />
                  </IconAction>
                  <IconAction label="Editar" onClick={() => onEdit(workout)}>
                    <Pencil className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    label="Baixar em PDF"
                    disabled={exportingId === workout.id}
                    onClick={() => onExportPdf(workout.id)}
                  >
                    {exportingId === workout.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </IconAction>
                  <IconAction label="Mover para cima" disabled={index === 0} onClick={() => onMove(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    label="Mover para baixo"
                    disabled={index === workouts.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconAction>
                  <IconAction label="Excluir" className="text-[#b14a35]" onClick={() => onDelete(workout.id)}>
                    <Trash2 className="h-4 w-4" />
                  </IconAction>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {renaming && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-[#20231f]/70 p-4">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#f7f7f2] p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Renomear workout"
          >
            <h3 className="font-display text-lg font-semibold">Renomear workout</h3>
            <Input
              autoFocus
              className="mt-3 bg-white"
              value={renaming.title}
              onChange={event => setRenaming({ ...renaming, title: event.target.value })}
              onKeyDown={event => {
                if (event.key === "Enter" && renaming.title.trim()) {
                  onRename(renaming.id, renaming.title.trim());
                  setRenaming(null);
                }
              }}
            />
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1 bg-[#e06b3c] text-white hover:bg-[#c8562c]"
                disabled={!renaming.title.trim()}
                onClick={() => {
                  onRename(renaming.id, renaming.title.trim());
                  setRenaming(null);
                }}
              >
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => setRenaming(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
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
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.workout?.title || "Workout removido"}</p>
                <p className="mt-1 text-xs text-[#6d746a]">
                  {item.session.action === "completed" ? "Concluído" : "Pulado"} ·{" "}
                  {new Date(item.session.performedAt).toLocaleString("pt-BR")}
                </p>
                {/* Só aparece quando houve cronômetro: sessão marcada na mão
                    não tem tempo, e inventar um seria pior que omitir. */}
                {item.session.durationSeconds != null && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold tabular-nums text-[#e06b3c]">
                    <TimerIcon className="h-3 w-3" />
                    {formatTimerDisplay(item.session.durationSeconds)}
                  </p>
                )}
              </div>
            </button>
            {openId === item.session.id && item.session.snapshot && <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-[#f1f1eb] p-3 text-[11px] leading-5 text-[#6d746a]">{item.session.snapshot}</pre>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateWorkout({ value, setValue, busy, onClose, onCreate, sectionTitleOptions = [] }: any) {
  const sections = value.sections || [];
  const setSections = (next: any[]) => setValue({ ...value, sections: next });
  const invalid = sections.some((section: any) => !section.title?.trim() || (section.exercises || []).some((exercise: any) => !exercise.name?.trim() || (!exercise.prescription?.trim() && !exercise.sets && !exercise.reps && !exercise.duration && !exercise.load)));
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#20231f]/50 p-0 sm:place-items-center sm:p-6">
      {/* Sem teto de altura o formulário simplesmente saía da tela: com seções e
          exercícios ele fica muito mais alto que o viewport do celular. */}
      <Card className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none border-0 bg-[#f7f7f2] sm:rounded-2xl">
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
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
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
            <div className="flex items-center justify-between"><Label>Seções e exercícios</Label><Button type="button" variant="outline" size="sm" onClick={() => setSections([...sections, { title: "", format: "", notes: "", exercises: [] }])}><Plus className="mr-1 h-3 w-3" />Seção</Button></div>
            {sections.map((section: any, sectionIndex: number) => <div key={sectionIndex} className="rounded-xl border border-[#dedfd6] bg-white p-3 space-y-3"><div className="flex gap-2"><div className="min-w-0 flex-1"><SectionTitleSelect value={section.title || ""} options={sectionTitleOptions} onChange={(title: string) => { const next = [...sections]; next[sectionIndex] = { ...section, title }; setSections(next); }} /></div><Button type="button" variant="ghost" size="icon" disabled={sectionIndex === 0} onClick={() => { const next = [...sections]; [next[sectionIndex - 1], next[sectionIndex]] = [next[sectionIndex], next[sectionIndex - 1]]; setSections(next); }}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={sectionIndex === sections.length - 1} onClick={() => { const next = [...sections]; [next[sectionIndex], next[sectionIndex + 1]] = [next[sectionIndex + 1], next[sectionIndex]]; setSections(next); }}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="text-[#b14a35]" onClick={() => setSections(sections.filter((_: any, index: number) => index !== sectionIndex))}><Trash2 className="h-4 w-4" /></Button></div><Input value={section.format || ""} onChange={event => { const next = [...sections]; next[sectionIndex] = { ...section, format: event.target.value }; setSections(next); }} placeholder="Formato (ex.: EMOM, AMRAP, força)" />{(section.exercises || []).map((exercise: any, exerciseIndex: number) => <div key={exerciseIndex} className="rounded-lg bg-[#f1f1eb] p-3 space-y-2"><div className="flex gap-2"><Input value={exercise.name || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, name: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder="Exercício" /><Button type="button" variant="ghost" size="icon" disabled={exerciseIndex === 0} onClick={() => { const next = [...sections]; const exercises = [...(section.exercises || [])]; [exercises[exerciseIndex - 1], exercises[exerciseIndex]] = [exercises[exerciseIndex], exercises[exerciseIndex - 1]]; next[sectionIndex] = { ...section, exercises }; setSections(next); }}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={exerciseIndex === (section.exercises || []).length - 1} onClick={() => { const next = [...sections]; const exercises = [...(section.exercises || [])]; [exercises[exerciseIndex], exercises[exerciseIndex + 1]] = [exercises[exerciseIndex + 1], exercises[exerciseIndex]]; next[sectionIndex] = { ...section, exercises }; setSections(next); }}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => { const next = [...sections]; next[sectionIndex] = { ...section, exercises: section.exercises.filter((_: any, index: number) => index !== exerciseIndex) }; setSections(next); }}><Trash2 className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["sets","Séries"],["reps","Reps"],["duration","Tempo"],["load","Carga"]].map(([field, label]) => <Input key={field} value={exercise[field] || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, [field]: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder={label} />)}</div><Input value={exercise.prescription || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, prescription: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder="Prescrição / observação do exercício" /><Textarea value={exercise.notes || ""} onChange={event => { const next = [...sections]; const exercises = [...(section.exercises || [])]; exercises[exerciseIndex] = { ...exercise, notes: event.target.value }; next[sectionIndex] = { ...section, exercises }; setSections(next); }} placeholder="Notas do exercício" /></div>)}<Button type="button" variant="outline" size="sm" onClick={() => { const next = [...sections]; next[sectionIndex] = { ...section, exercises: [...(section.exercises || []), { name: "", prescription: "", sets: "", reps: "", duration: "", load: "", notes: "" }] }; setSections(next); }}><Plus className="mr-1 h-3 w-3" />Exercício</Button><Textarea value={section.notes || ""} onChange={event => { const next = [...sections]; next[sectionIndex] = { ...section, notes: event.target.value }; setSections(next); }} placeholder="Notas da seção" /></div>)}{invalid && <p className="text-xs text-[#b14a35]">Cada seção precisa de nome; cada exercício precisa de nome e prescrição ou ao menos uma métrica (séries, reps, tempo ou carga).</p>}</div>
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
