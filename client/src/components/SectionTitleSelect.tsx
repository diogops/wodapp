import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState } from "react";

const NEW_OPTION = "__new__";

/**
 * Título de seção escolhido de uma lista, não digitado livre. Campo aberto
 * fazia "WOD", "Wod - AMRAP 15" e "wod principal" virarem três seções
 * diferentes, o que impede comparar sessões equivalentes ao longo do tempo.
 *
 * As opções vêm dos títulos que o próprio atleta já usou; um título novo entra
 * pelo modal e passa a valer para os próximos workouts.
 */
export function SectionTitleSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (title: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  // O título atual entra na lista mesmo se ainda não existir no banco — sem
  // isso, editar um workout salvo mostraria o select vazio.
  const merged = Array.from(new Set([...(value ? [value] : []), ...options]));

  const confirm = () => {
    const title = draft.trim();
    if (!title) return;
    onChange(title);
    setDraft("");
    setCreating(false);
  };

  return (
    <>
      <Select
        value={value || undefined}
        onValueChange={next => {
          if (next === NEW_OPTION) setCreating(true);
          else onChange(next);
        }}
      >
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Escolha a seção" />
        </SelectTrigger>
        <SelectContent>
          {merged.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={NEW_OPTION} className="text-[#e06b3c]">
            + Nova seção…
          </SelectItem>
        </SelectContent>
      </Select>

      {creating && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#20231f]/70 p-4">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#f7f7f2] p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Nova seção"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e06b3c]">
                  Padronize
                </p>
                <h3 className="font-display text-lg font-semibold">Nova seção</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cancelar"
                onClick={() => {
                  setDraft("");
                  setCreating(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Input
              autoFocus
              className="bg-white"
              placeholder="Ex.: Técnica, WOD, Finisher, Core"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirm();
                }
              }}
            />
            <p className="mt-2 text-xs leading-5 text-[#6d746a]">
              O nome escolhido passa a aparecer na lista dos próximos workouts.
            </p>
            <Button
              type="button"
              className="mt-3 w-full bg-[#e06b3c] text-white hover:bg-[#c8562c]"
              disabled={!draft.trim()}
              onClick={confirm}
            >
              <Plus className="mr-2 h-4 w-4" />
              Usar esta seção
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
