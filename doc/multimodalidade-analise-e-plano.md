# Multimodalidade — análise da spec e plano adaptado

Resposta aos entregáveis 1 e 2 de `wodsequencermultimodalidadeprompt.md`: o mapa do
que existe, onde CrossFit está acoplado, e o plano depois de adaptar a spec à
arquitetura real deste projeto.

---

## 1. Conflitos com a spec — leia isto primeiro

A spec foi escrita para um app **frontend-only com IndexedDB**. Este app não é
isso. Três restrições declaradas "não-negociáveis" na spec são incompatíveis com
o que já está no ar, e segui-las significaria descartar trabalho funcionando.

| Spec | Realidade | Decisão |
|---|---|---|
| **R1** — frontend-only, sem backend, IndexedDB | Express + tRPC + **Postgres** na Railway | **Manter o servidor.** O Postgres dá multi-dispositivo e sobrevive a limpar o navegador; IndexedDB perde tudo se o usuário limpar dados do site. Trocar seria regressão. |
| **R2** — offline-first total | Service worker cacheia só assets estáticos | **Manter.** Cachear dados de API foi exatamente o bug que serviu página de erro como app. Execução offline entra depois, com cache explícito só do treino ativo. |
| **R6** — BYOK, chave de IA do usuário no dispositivo | Chaves Anthropic/Mistral no servidor | **Manter no servidor.** App pessoal com allowlist de e-mail: BYOK adiciona fricção de configuração para zero ganho, e exporia a chave ao navegador. |

Duas adaptações menores:

- **Vocabulário.** A spec propõe renomear tudo (`Workout`/`Block`/`ExerciseInstance`).
  Nossas tabelas são `workouts` / `workoutSections` / `workoutExercises`, com o
  mesmo formato de árvore. Renomear é churn sem ganho para o usuário — **mapeamos
  os conceitos, não os nomes**: `Block` ≙ `workoutSections` + coluna `kind`.
- **Ilustrações por keypoints + pipeline Python** (seção 8). Alto custo, valor
  imediato baixo — já temos demonstrações por imagem. **Adiado**, não descartado.

O resto da spec — modalidade com gramática, `BlockKind`, agenda semanal,
`resolveOpening`, execução por tipo de bloco — é aproveitável e valioso.

---

## 2. Mapa do que existe hoje

**Dados** (`drizzle/schema.ts`, Postgres):

```
users ──< workouts ──< workoutSections ──< workoutExercises
              └──< workoutSessions          (histórico, com snapshot JSON)
         workoutDrafts                      (proposta da IA, fora da fila)
```

Sem foreign keys; `server/db.ts` monta a árvore em memória e apaga os filhos na
mão. Ordem explícita por `orderIndex` em todos os níveis.

**Estado e execução.** Tudo no cliente, em `client/src/pages/Home.tsx`:
seleção do treino do dia, timer por exercício, cronômetro do WOD, marcação de
concluídos (localStorage por workout). Lógica pura extraída em
`client/src/lib/workoutTimer.ts` e `workoutSelection.ts`.

**PWA.** `manifest.webmanifest`, `sw.js` (só assets imutáveis), ícones gerados
por `scripts/generate-icons.mjs`, metas do iOS em `client/index.html`.

**IA.** `server/llm.ts` — geração e estruturação com schema JSON, provedor
configurável (Mistral por padrão, Anthropic opcional). `server/ocr.ts` para PDF.

---

## 3. Onde "tudo é CrossFit" está acoplado

| Local | Acoplamento |
|---|---|
| `server/db.ts` → `DEFAULT_WORKOUTS` | Quatro WODs de CrossFit semeados para todo usuário novo |
| `shared/exerciseCatalog.ts` | Categorias (LPO, Ginástico…) e capacidades são vocabulário de CrossFit |
| `server/llm.ts` → `GENERATOR_SYSTEM_PROMPT` | "Você é um treinador de CrossFit" |
| `Home.tsx` | Rótulos fixos: "WOD surpresa", "Workout N de M", "Treino em execução" |
| `Home.tsx` → timer | Um único comportamento: regressiva ou cronômetro. Não existe descanso entre séries |
| `workoutSections.format` | Texto livre ("AMRAP 15") fazendo o papel de `BlockKind`, sem semântica |
| `client/index.html`, manifest | Nome "Workout Sequencer" — neutro, não precisa mudar |

**O achado que mais importa:** `format` já é o embrião do `BlockKind`, só que
como string livre. É por ali que a migração entra sem quebrar nada.

---

## 4. Plano adaptado

Cada fase deixa o app funcionando e o usuário de CrossFit sem regressão.

**Fase 1 — Fundação.** Tabela `modalities` com gramática; `modalityId` em
`workouts`; migração que cria a modalidade `crossfit` e associa todo workout
existente a ela; filtro por modalidade na biblioteca; gestão de modalidades no
menu principal. *Critério: quem só usa CrossFit não percebe diferença.*

**Fase 2 — Gramática e execução por bloco.** `kind` em `workoutSections`,
derivado do `format` atual; tela de execução variando por kind; `straight_sets`
com descanso automático e registro de carga. *Critério: dá para treinar
musculação sem gambiarra.*

**Fase 3 — Agenda.** Regras semanais por modalidade, editor com preview da
semana e detecção de conflito.

**Fase 4 — `resolveOpening`.** Função pura com os 8 ramos da spec e testes por
`ResolutionReason`; banner de motivo; troca de modalidade em um toque.

**Fase 5 — IA por modalidade.** Prompt derivado da gramática em vez de fixo em
CrossFit; catálogo de exercícios por modalidade.

**Fase 6 — Histórico por modalidade.** Volume semanal, evolução de carga.

**Adiado:** ilustrações por keypoints (seção 8 da spec) e execução offline
completa. Nenhum dos dois é bloqueante para as fases acima.

---

## 5. O que muda para você

Nada, por padrão. CrossFit continua sendo a modalidade do seu treino, os quatro
WODs semeados continuam lá, e a tela de execução é a mesma. As modalidades novas
aparecem como **opção** no menu principal — se você nunca abrir, o app se
comporta exatamente como hoje.
