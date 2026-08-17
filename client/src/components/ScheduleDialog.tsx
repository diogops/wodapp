import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { WEEKDAY_LABELS, buildWeekPreview, findScheduleConflicts } from "@shared/scheduleConflicts";
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type RuleForm = {
  id?: number;
  modalityId: number;
  weekdays: number[];
  startTime: string;
  durationMinutes: number;
  preferredWorkoutId: number | null;
  enabled: boolean;
};

const emptyForm = (modalityId: number): RuleForm => ({
  modalityId,
  weekdays: [],
  startTime: "",
  durationMinutes: 60,
  preferredWorkoutId: null,
  enabled: true,
});

/**
 * Editor da agenda semanal.
 *
 * A prévia da semana fica ao lado do formulário de propósito: uma agenda é
 * fácil de descrever errado e difícil de conferir por lista, e o conflito de
 * horário só é óbvio quando os dois treinos aparecem no mesmo dia.
 */
export function ScheduleDialog({
  modalities,
  workouts,
  prefs,
  onClose,
}: {
  modalities: Array<{ id: number; name: string }>;
  workouts: Array<{ id: number; title: string; modalityId: number | null }>;
  prefs: { autoStartEnabled: boolean; scheduleLeadMinutes: number; scheduleGraceMinutes: number };
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const rulesQuery = trpc.schedule.list.useQuery();
  const rules = rulesQuery.data ?? [];
  const [form, setForm] = useState<RuleForm | null>(null);

  const refresh = () => {
    void utils.schedule.list.invalidate();
    void utils.auth.me.invalidate();
  };
  const save = trpc.schedule.save.useMutation({
    onSuccess: () => { refresh(); setForm(null); toast.success("Agenda atualizada"); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.schedule.remove.useMutation({
    onSuccess: () => { refresh(); toast.success("Regra removida"); },
  });
  const setPrefs = trpc.schedule.setPrefs.useMutation({ onSuccess: refresh });

  const week = useMemo(
    () => buildWeekPreview(rules, prefs.scheduleGraceMinutes),
    [rules, prefs.scheduleGraceMinutes]
  );
  const conflicts = useMemo(
    () => findScheduleConflicts(rules, prefs.scheduleGraceMinutes),
    [rules, prefs.scheduleGraceMinutes]
  );
  const modalityName = (id: number) => modalities.find(modality => modality.id === id)?.name ?? "Modalidade";
  const busy = save.isPending || remove.isPending;

  return (
    <div className="app-overlay fixed inset-0 z-[75] grid place-items-center bg-[#20231f]/70 p-4">
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[#f7f7f2] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Agenda de treinos"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#dedfd6] p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e06b3c]">Agenda</p>
            <h3 className="font-display text-xl font-semibold">Sua semana</h3>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* Prévia: sete linhas, uma por dia. Dia vazio aparece assim mesmo —
              é a informação mais útil de todas para quem está montando a semana. */}
          <div className="rounded-2xl border border-[#dedfd6] bg-white p-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label, weekday) => (
                <div key={label} className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#6d746a]">{label}</p>
                  <div className="mt-1 space-y-1">
                    {week[weekday].length === 0 ? (
                      <p className="text-[10px] text-[#b6bbb2]">—</p>
                    ) : (
                      week[weekday].map(({ rule, conflicted }) => (
                        <div
                          key={rule.id}
                          className={`truncate rounded px-0.5 py-0.5 text-[9px] leading-tight ${
                            conflicted ? "bg-[#f4e4dd] text-[#8a4a2f]" : "bg-[#e9eae2] text-[#20231f]"
                          }`}
                          title={`${modalityName(rule.modalityId)}${rule.startTime ? ` · ${rule.startTime}` : ""}`}
                        >
                          {rule.startTime ?? "livre"}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="flex gap-2 rounded-xl bg-[#f4e4dd] px-3 py-2 text-xs leading-5 text-[#8a4a2f]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                {conflicts.map((conflict, index) => (
                  <p key={index}>
                    {WEEKDAY_LABELS[conflict.weekday]}: {modalityName(conflict.a.modalityId)} ({conflict.a.startTime})
                    e {modalityName(conflict.b.modalityId)} ({conflict.b.startTime}) se sobrepõem — ao abrir o app
                    nesse horário você vai escolher entre os dois.
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Regras existentes */}
          <div className="space-y-2">
            {rulesQuery.isLoading ? (
              <p className="text-sm text-[#6d746a]">Carregando…</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-[#6d746a]">
                Sem regras ainda. Sem agenda o app abre no treino de sempre — a agenda só entra quando
                você tem mais de uma modalidade em dias diferentes.
              </p>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-2 rounded-xl border border-[#dedfd6] bg-white p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{modalityName(rule.modalityId)}</p>
                    <p className="text-xs text-[#6d746a]">
                      {rule.weekdays.map(day => WEEKDAY_LABELS[day]).join(", ")}
                      {rule.startTime ? ` · ${rule.startTime} · ${rule.durationMinutes}min` : " · sem horário"}
                      {rule.enabled ? "" : " · pausada"}
                    </p>
                  </div>
                  <Button
                    type="button" variant="ghost" size="icon" aria-label="Editar regra"
                    onClick={() => setForm({
                      id: rule.id,
                      modalityId: rule.modalityId,
                      weekdays: rule.weekdays,
                      startTime: rule.startTime ?? "",
                      durationMinutes: rule.durationMinutes,
                      preferredWorkoutId: rule.preferredWorkoutId,
                      enabled: rule.enabled,
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="text-[#b14a35]" aria-label="Remover regra"
                    disabled={busy}
                    onClick={() => remove.mutate({ id: rule.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {form ? (
            <div className="space-y-2.5 rounded-2xl border border-[#dedfd6] bg-white p-3">
              <Select
                value={String(form.modalityId)}
                onValueChange={value => setForm({ ...form, modalityId: Number(value), preferredWorkoutId: null })}
              >
                <SelectTrigger aria-label="Modalidade da regra"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modalities.map(modality => (
                    <SelectItem key={modality.id} value={String(modality.id)}>{modality.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                {WEEKDAY_LABELS.map((label, weekday) => {
                  const on = form.weekdays.includes(weekday);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      className={`h-9 flex-1 rounded-lg text-xs font-semibold ${
                        on ? "bg-[#20231f] text-[#f7f7f2]" : "bg-[#e9eae2] text-[#6d746a]"
                      }`}
                      onClick={() => setForm({
                        ...form,
                        weekdays: on
                          ? form.weekdays.filter(day => day !== weekday)
                          : [...form.weekdays, weekday].sort((a, b) => a - b),
                      })}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Input
                  type="time"
                  aria-label="Horário de início"
                  className="flex-1"
                  value={form.startTime}
                  onChange={event => setForm({ ...form, startTime: event.target.value })}
                />
                <Input
                  type="number"
                  aria-label="Duração em minutos"
                  className="w-24"
                  min={5}
                  max={300}
                  value={form.durationMinutes}
                  onChange={event => setForm({ ...form, durationMinutes: Number(event.target.value) })}
                />
              </div>

              {/* Treino fixo é opcional: sem ele o app roda os treinos da
                  modalidade pelo mais antigo, que é o que a maioria quer. */}
              <Select
                value={form.preferredWorkoutId === null ? "rotate" : String(form.preferredWorkoutId)}
                onValueChange={value =>
                  setForm({ ...form, preferredWorkoutId: value === "rotate" ? null : Number(value) })
                }
              >
                <SelectTrigger aria-label="Treino preferido"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rotate">Rodar os treinos da modalidade</SelectItem>
                  {workouts
                    .filter(workout => workout.modalityId === form.modalityId)
                    .map(workout => (
                      <SelectItem key={workout.id} value={String(workout.id)}>{workout.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={event => setForm({ ...form, enabled: event.target.checked })}
                />
                Regra ativa
              </label>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-[#e06b3c] text-white hover:bg-[#c8562c]"
                  disabled={busy || form.weekdays.length === 0}
                  onClick={() => save.mutate({
                    id: form.id,
                    modalityId: form.modalityId,
                    weekdays: form.weekdays,
                    startTime: form.startTime || null,
                    durationMinutes: form.durationMinutes,
                    preferredWorkoutId: form.preferredWorkoutId,
                    enabled: form.enabled,
                  })}
                >
                  {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar regra
                </Button>
                <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
              </div>
              {form.weekdays.length === 0 && (
                <p className="text-xs text-[#b14a35]">Escolha ao menos um dia da semana.</p>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              disabled={modalities.length === 0}
              onClick={() => setForm(emptyForm(modalities[0]?.id ?? 0))}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nova regra
            </Button>
          )}

          <div className="space-y-2 rounded-2xl border border-[#dedfd6] bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d746a]">Ao abrir o app</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.autoStartEnabled}
                onChange={event => setPrefs.mutate({ autoStartEnabled: event.target.checked })}
              />
              Cair direto no treino da agenda
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 text-xs text-[#6d746a]">
                Antecedência (min)
                <Input
                  type="number" min={0} max={240} className="mt-1"
                  defaultValue={prefs.scheduleLeadMinutes}
                  onBlur={event => setPrefs.mutate({ scheduleLeadMinutes: Number(event.target.value) })}
                />
              </label>
              <label className="flex-1 text-xs text-[#6d746a]">
                Tolerância de atraso (min)
                <Input
                  type="number" min={0} max={240} className="mt-1"
                  defaultValue={prefs.scheduleGraceMinutes}
                  onBlur={event => setPrefs.mutate({ scheduleGraceMinutes: Number(event.target.value) })}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
