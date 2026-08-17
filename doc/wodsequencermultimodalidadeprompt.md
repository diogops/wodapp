# WodSequencer 2.0 — Expansão para Multimodalidade

> **Como usar:** cole este documento inteiro como prompt para o agente de código, junto com o repositório atual do WodSequencer. Ele descreve o *quê* e o *porquê*; o agente decide o *como* dentro das restrições declaradas na seção 2.

---

## 0. Instrução ao agente

Você vai evoluir o **WodSequencer**, um PWA offline-first que hoje executa WODs de CrossFit como uma sequência cronometrada. O objetivo é transformá-lo em um **executor de treino multimodalidade**, mantendo intacta a experiência atual de CrossFit.

Antes de escrever código:

1. Leia o repositório e produza um **mapa do que existe hoje**: modelo de dados atual, onde vive o estado, como o timer/sequenciador funciona, como os WODs são persistidos, o que já é PWA (service worker, manifest, cache).
2. Aponte **onde a suposição "tudo é CrossFit" está hardcoded** (nomes de campo, tipos de bloco, timers, UI).
3. Só então proponha o plano de migração e implemente pelas fases da seção 11.

Não faça big bang rewrite. Cada fase deve deixar o app funcionando e o usuário atual de CrossFit sem regressão.

---

## 1. Objetivo

Hoje o app assume uma única modalidade. Depois desta expansão:

- O usuário cadastra **quantas modalidades quiser** (CrossFit, musculação, calistenia, corrida, mobilidade, HIIT, ou uma customizada).
- Cada modalidade tem **suas próprias estruturas de treino, timers e métricas** — musculação não é "AMRAP", é série/rep/carga/descanso.
- Os treinos são **organizados e filtrados por modalidade**.
- O usuário pode dar à modalidade uma **agenda semanal** (dias e, opcionalmente, horários). Ao abrir o app, ele **cai direto no treino certo** quando o contexto é inequívoco, e vê um seletor rápido quando não é.
- A **IA gera o treino completo** a partir de intenção em linguagem natural, respeitando a gramática da modalidade.
- Cada exercício tem uma **ilustração** simples gerada por código (não é anatomia médica, é "como fica o corpo") — leve, offline, sem dependência de rede.

---

## 2. Restrições não-negociáveis

| # | Restrição |
|---|---|
| R1 | **Frontend-only.** Não existe backend próprio. Toda persistência é local (IndexedDB para dados, Cache Storage para assets). |
| R2 | **Offline-first.** Executar um treino já salvo, cronometrar, registrar e navegar o histórico **funciona 100% sem rede**. Rede é necessária apenas para *gerar* conteúdo novo com IA. |
| R3 | **Sem regressão de CrossFit.** Os WODs existentes migram automaticamente para a modalidade `crossfit`. Zero passos manuais para o usuário atual. |
| R4 | **Sem lock-in de modalidade.** Nenhuma regra, timer ou tela pode ser específica de CrossFit no núcleo. Especificidade vive em *configuração de modalidade*, não em `if (modality === 'crossfit')`. |
| R5 | **Ilustrações geradas por código**, determinísticas, versionadas, sem chamada de rede em runtime e sem modelo de difusão. |
| R6 | **A chave de API da IA é do usuário** (BYOK), guardada localmente, nunca commitada, e o app é plenamente utilizável sem ela. |

---

## 3. Modelo de dados

Use estes nomes. Se o repo já tem entidades equivalentes, migre para este vocabulário e escreva a migração.

```ts
// ---------- Modalidade ----------
type ModalityId = string;              // slug: 'crossfit' | 'strength' | 'calisthenics' | ...

interface Modality {
  id: ModalityId;
  name: string;                        // "CrossFit", "Musculação"
  color: string;                       // token de cor, usado para reconhecimento instantâneo
  icon: string;                        // nome do ícone
  builtIn: boolean;
  archived: boolean;

  /** A gramática da modalidade — é isto que evita hardcode. */
  grammar: ModalityGrammar;

  schedule: ScheduleRule[];
  createdAt: string;                   // ISO
  updatedAt: string;
}

interface ModalityGrammar {
  /** Tipos de bloco que fazem sentido aqui. Ver seção 4. */
  allowedBlockKinds: BlockKind[];
  /** Métricas que o usuário registra por set. */
  trackedMetrics: MetricKey[];         // 'reps' | 'load' | 'time' | 'distance' | 'calories' | 'rpe' | 'holdSeconds' | 'rounds'
  /** Unidade de carga padrão. */
  defaultLoadUnit: 'kg' | 'lb' | 'bodyweight' | 'band' | 'none';
  /** Descanso entre séries é um conceito de primeira classe aqui? */
  restIsFirstClass: boolean;
  /** Comportamento padrão do sequenciador: avança sozinho ou espera confirmação? */
  defaultAdvance: 'auto' | 'manual';
  /** Vocabulário exibido ao usuário, para a UI não falar "WOD" em musculação. */
  labels: {
    workout: string;                   // "WOD" | "Treino" | "Sessão"
    block: string;                     // "Parte" | "Exercício" | "Bloco"
    unitOfWork: string;                // "Round" | "Série" | "Set"
  };
}

// ---------- Treino ----------
interface Workout {
  id: string;
  modalityId: ModalityId;
  name: string;
  notes?: string;
  source: 'manual' | 'ai' | 'template' | 'imported';
  aiPrompt?: string;                   // intenção original, para regenerar/ajustar
  estimatedMinutes: number;
  tags: string[];                      // 'upper', 'metcon', 'deload', 'pull'
  blocks: Block[];
  createdAt: string;
  lastPerformedAt?: string;
  timesPerformed: number;
  archived: boolean;
}

interface Block {
  id: string;
  kind: BlockKind;                     // ver seção 4
  title: string;                       // "Aquecimento", "A. Back Squat", "Metcon"
  /** Configuração dependente do kind — discriminated union. */
  config: BlockConfig;
  items: ExerciseInstance[];
  /** Descanso após o bloco inteiro, em segundos. */
  restAfterSeconds?: number;
}

interface ExerciseInstance {
  id: string;
  exerciseId: string;                  // FK para o catálogo
  displayName: string;                 // desnormalizado, para render offline instantâneo
  prescription: Prescription;          // ver seção 4
  scalingNote?: string;                // "com faixa", "joelhos apoiados"
  substitutionOf?: string;             // exerciseId original, se o usuário trocou
}

// ---------- Catálogo de exercícios ----------
interface Exercise {
  id: string;                          // slug estável: 'back-squat', 'ring-dip'
  name: string;
  aliases: string[];                   // "agachamento livre", "squat"
  modalityIds: ModalityId[];           // pode pertencer a várias
  primaryMuscles: string[];
  equipment: string[];                 // 'barbell' | 'rings' | 'none' | ...
  cues: string[];                      // 3-5 bullets curtos de execução
  /** Ver seção 8. */
  pose: PoseSequence;
  source: 'builtin' | 'ai' | 'user';
  createdAt: string;
}

// ---------- Agenda ----------
interface ScheduleRule {
  id: string;
  /** 0 = domingo ... 6 = sábado. */
  weekdays: number[];
  /** Opcional. Se ausente, a regra é "esse dia, sem hora definida". */
  startTime?: string;                  // "06:30", hora local
  durationMinutes?: number;            // default 60
  /** Preferência de treino: se vazio, o app sugere o próximo da rotação. */
  preferredWorkoutId?: string;
  enabled: boolean;
}

// ---------- Execução ----------
interface Session {
  id: string;
  workoutId: string;
  modalityId: ModalityId;
  startedAt: string;
  finishedAt?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  /** Registro real do que foi feito, que pode divergir do prescrito. */
  entries: SetEntry[];
  /** Resultado global: tempo total, rounds+reps, tonelagem — depende da modalidade. */
  result?: Record<MetricKey, number | string>;
  perceivedEffort?: number;            // 1-10
  notes?: string;
}

interface SetEntry {
  blockId: string;
  exerciseInstanceId: string;
  setIndex: number;
  metrics: Partial<Record<MetricKey, number>>;
  completedAt: string;
  skipped: boolean;
}

// ---------- Preferências ----------
interface UserPrefs {
  defaultModalityId?: ModalityId;
  autoStartEnabled: boolean;           // pular o seletor quando inequívoco
  scheduleLeadMinutes: number;         // default 60  — quanto antes do horário já conta
  scheduleGraceMinutes: number;        // default 45  — quanto depois ainda conta
  resumeWindowHours: number;           // default 6   — sessão inacabada ainda é retomável
  units: 'metric' | 'imperial';
  keepScreenAwake: boolean;
  sound: { countdown: boolean; blockChange: boolean; volume: number };
  ai: { provider: string; apiKeyRef: string; model: string } | null;
}
```

**Migração obrigatória:** todo `Workout` existente recebe `modalityId: 'crossfit'`; a modalidade `crossfit` é criada com a `grammar` da seção 4; `Session`/histórico existente é backfilled. A migração é idempotente e versionada (`schemaVersion` no IndexedDB).

---

## 4. Gramática por modalidade

`BlockKind` é o conceito central. Cada kind traz um `config` e uma `prescription` próprios, e o sequenciador sabe cronometrá-lo. **Não crie um tipo de bloco por modalidade — crie tipos de bloco reutilizáveis e deixe a modalidade escolher quais usa.**

```ts
type BlockKind =
  | 'for_time'        // completar X o mais rápido possível, com cap
  | 'amrap'           // máximo de rounds/reps em T
  | 'emom'            // a cada minuto, por N minutos
  | 'tabata'          // intervalos work/rest fixos
  | 'intervals'       // work/rest customizável, N rounds
  | 'straight_sets'   // N séries x reps, com descanso — musculação
  | 'superset'        // 2+ exercícios alternados, descanso ao fim do par
  | 'circuit'         // sequência com pouco descanso, N voltas
  | 'skill'           // prática técnica por tempo ou tentativas
  | 'hold'            // isometria: prancha, L-sit, hollow
  | 'distance'        // corrida/remo/bike por distância
  | 'warmup'
  | 'cooldown'
  | 'rest';
```

Perfis embutidos (o app cria estes na primeira execução):

| Modalidade | `allowedBlockKinds` | `trackedMetrics` | Carga | Avanço | Labels |
|---|---|---|---|---|---|
| **CrossFit** | warmup, skill, straight_sets, for_time, amrap, emom, tabata, intervals, cooldown | reps, load, time, rounds, calories, distance | kg | auto | WOD / Parte / Round |
| **Musculação** | warmup, straight_sets, superset, hold, cooldown | reps, load, rpe | kg | manual | Treino / Exercício / Série |
| **Calistenia** | warmup, skill, straight_sets, hold, circuit, cooldown | reps, holdSeconds, rpe | bodyweight | manual | Treino / Bloco / Série |
| **HIIT / Funcional** | warmup, intervals, tabata, circuit, cooldown | time, reps, calories | none | auto | Sessão / Bloco / Round |
| **Corrida / Endurance** | warmup, distance, intervals, cooldown | distance, time | none | auto | Sessão / Bloco / Tiro |
| **Mobilidade** | hold, skill | holdSeconds | none | auto | Sessão / Bloco / Posição |

O usuário pode criar uma modalidade custom escolhendo esses mesmos campos. **A tabela acima é seed data, não código.**

### Diferença de comportamento no sequenciador

Isto é o que faz o app parecer nativo de cada modalidade:

- **`straight_sets` (musculação):** a tela mostra série atual, reps alvo, carga sugerida (última usada + progressão), e um botão grande "Série feita". Ao confirmar, dispara **automaticamente o cronômetro de descanso** e o avanço só ocorre quando o descanso termina ou o usuário pula. Registro de carga inline, com incremento rápido (±2,5 kg).
- **`amrap` / `for_time` (CrossFit):** cronômetro global protagonista, lista de movimentos secundária, avanço automático, tap grande para marcar round.
- **`emom`:** grid de minutos, destaque do minuto corrente, aviso sonoro a cada virada.
- **`hold` (calistenia/mobilidade):** contagem regressiva única, tela minimalista, aviso aos 10s e 3-2-1.
- **`intervals` / `tabata`:** alternância work/rest com cor de fundo distinta e áudio em cada transição.
- **`distance`:** cronômetro crescente + campo de distância; sem GPS (fora de escopo), entrada manual ou do relógio depois.

---

## 5. Motor de auto-seleção ao abrir o app

Esta é a funcionalidade que define a sensação do produto: **abrir e já estar no treino certo.** Implemente como uma função pura, testável, isolada da UI.

```ts
type Resolution =
  | { kind: 'onboarding' }
  | { kind: 'resume'; session: Session }
  | { kind: 'auto'; modality: Modality; workout: Workout; reason: ResolutionReason }
  | { kind: 'picker'; candidates: Candidate[]; reason: ResolutionReason };

type ResolutionReason =
  | 'no_modalities' | 'session_in_progress' | 'single_modality'
  | 'single_scheduled_today' | 'time_window_match' | 'nearest_upcoming'
  | 'ambiguous_time' | 'multiple_today' | 'nothing_scheduled' | 'user_locked';

function resolveOpening(now: Date, state: AppState, prefs: UserPrefs): Resolution
```

Ordem de avaliação — **para no primeiro match**:

1. **Nenhuma modalidade cadastrada** → `onboarding`.
2. **Sessão `in_progress`** iniciada há menos de `resumeWindowHours` → `resume`. Retomar sempre ganha de escolher.
3. **`autoStartEnabled === false`** → `picker` com todas as modalidades, ordenadas pela heurística do passo 8. (`user_locked`)
4. **Exatamente 1 modalidade ativa no app** → `auto` com essa modalidade. (`single_modality`)
5. Calcule `todayRules` = regras habilitadas cujo `weekdays` contém o dia local de hoje.
   - **`todayRules.length === 1`** → `auto`. (`single_scheduled_today`)
6. **`todayRules.length > 1`, todas com `startTime`:**
   - Se **exatamente uma** janela `[start − leadMinutes, start + duration + graceMinutes]` contém `now` → `auto`. (`time_window_match`)
   - Se **nenhuma** contém `now`, mas existe **uma única** regra futura hoje dentro de `leadMinutes` → `auto`. (`nearest_upcoming`)
   - Se **mais de uma** janela contém `now` → `picker` só com essas, ordenadas por proximidade do `startTime`. (`ambiguous_time`)
   - Caso contrário → `picker` só com as regras de hoje. (`multiple_today`)
7. **`todayRules.length > 1` com ao menos uma sem `startTime`** → `picker` só com as regras de hoje. Sem hora não há como desempatar; não chute. (`multiple_today`)
8. **`todayRules.length === 0`** → `picker` com todas as modalidades, ordenadas por: `defaultModalityId` primeiro, depois recência de uso, depois frequência nos últimos 30 dias, depois alfabético. (`nothing_scheduled`)

Escolhido o par (modalidade, treino):

- Se a `ScheduleRule` tem `preferredWorkoutId`, use-o.
- Senão, use a **rotação**: o treino não-arquivado dessa modalidade com `lastPerformedAt` mais antigo (nulos primeiro). Isso dá um ciclo A/B/C natural em musculação sem exigir configuração.
- Se a modalidade não tem nenhum treino → leve à tela de criação **já com a modalidade pré-selecionada**, oferecendo gerar com IA.

### Regras de UX inegociáveis do auto-start

- O auto-start **nunca inicia o cronômetro sozinho.** Ele carrega a tela de pré-treino, com a sequência visível e um botão "Começar".
- O cabeçalho sempre mostra a modalidade escolhida com sua cor e um affordance de **troca em 1 toque** ("CrossFit ▾"), que abre o picker completo.
- Mostre o motivo em linguagem humana e discreta: *"Segunda, 6h30 — seu horário de CrossFit"*. Se o app adivinhou errado, o usuário precisa entender por quê.
- Trocar manualmente **não altera** a agenda; só afeta esta abertura.
- Se o usuário trocar manualmente na mesma janela **3 vezes**, sugira uma vez ajustar a agenda. Uma vez, não toda vez.

### Armadilhas a tratar

- Fuso horário e horário de verão: compute sempre com a **data local do dispositivo**; nunca com UTC.
- Virada de dia durante o treino (madrugada): a sessão pertence ao dia em que **começou**.
- App reaberto minutos depois: se já houve resolução nos últimos 30 min e nada mudou, **reuse a decisão** em vez de reavaliar e possivelmente mudar de modalidade na cara do usuário.
- Relógio do dispositivo alterado: use `performance.now()` para durações do cronômetro, `Date` só para agendamento.

---

## 6. Telas

### 6.1 Abertura / Splash resolvida
Roda `resolveOpening` e navega. Sem tela de espera perceptível — a resolução é síncrona sobre dados locais.

### 6.2 Seletor de modalidade
Grid de cards grandes, cor + ícone + nome + subtítulo (*"Push A · 5 exercícios · ~50 min"*). Um toque escolhe. Card de "Treino avulso" ao final, para o dia fora da rotina.

### 6.3 Gerenciar modalidades
Lista com reordenar, arquivar, editar. Editor de modalidade com: nome, cor, ícone, `grammar` (tipos de bloco permitidos como chips, métricas rastreadas, unidade de carga, avanço padrão, labels) e **agenda**.

### 6.4 Editor de agenda
O ponto mais fácil de errar. Faça assim:

- Seletor de dias da semana em pílulas (D S T Q Q S S).
- Toggle **"tem horário fixo"**. Desligado = regra só de dia. Ligado = hora de início + duração.
- Permite **múltiplas regras por modalidade** (ex.: CrossFit seg/qua/sex 6h30 **e** sáb 9h).
- **Preview ao vivo:** uma grade da semana mostrando o que abriria em cada dia, e destacando **conflitos** ("Terça 18h: Musculação e CrossFit se sobrepõem — o app vai perguntar"). Mostrar o conflito é melhor que resolvê-lo silenciosamente.

### 6.5 Biblioteca de treinos
Filtro por modalidade sempre visível (chips coloridos), busca por nome/tag, ordenação por recência/frequência/duração. Ação primária: "Novo treino" → manual ou IA.

### 6.6 Geração com IA
Campo de intenção livre ("costas e bíceps, 50 min, halteres e barra fixa") + controles rápidos: modalidade (pré-preenchida), duração, equipamento disponível, nível, foco, o que evitar (lesões). **Streaming do resultado** com preview editável antes de salvar — o usuário nunca é forçado a aceitar o que a IA cuspiu. Botões "Regenerar", "Trocar este exercício", "Deixar mais curto".

### 6.7 Pré-treino
Sequência completa em cards, duração estimada, equipamento necessário agregado, botão gigante "Começar". Permite reordenar e remover blocos antes de iniciar.

### 6.8 Execução
Tela desenhada para **ser lida de longe, com mão suada**: tipografia enorme, alvos de toque ≥ 64 px, cor de fundo por estado (trabalho / descanso / transição), wake lock ativo, áudio nas transições, gesto de swipe para pular. Layout muda conforme o `BlockKind` (seção 4). Ilustração do exercício acessível a um toque, sem sair da tela.

### 6.9 Pós-treino
Resumo, registro do resultado global, PSE, notas, e comparação com a última execução do mesmo treino ("+5 kg no supino", "1:12 mais rápido").

### 6.10 Histórico
Timeline filtrável por modalidade, com volume semanal por modalidade e evolução de carga por exercício.

---

## 7. Integração com IA

### 7.1 Contrato

A IA **não gera UI nem texto livre**. Ela retorna **JSON validado contra schema**. Se a validação falhar, tente reparar uma vez; se falhar de novo, mostre erro claro e ofereça template manual.

Duas capacidades separadas:

**A) `generateWorkout`** — recebe intenção + contexto, devolve um `Workout` completo:

```json
{
  "name": "Push A — Peito e Ombro",
  "estimatedMinutes": 52,
  "tags": ["push", "hipertrofia"],
  "blocks": [
    {
      "kind": "warmup",
      "title": "Aquecimento",
      "config": { "durationSeconds": 480 },
      "items": [
        { "exerciseRef": "band-pull-apart", "prescription": { "sets": 2, "reps": 15 } }
      ]
    },
    {
      "kind": "straight_sets",
      "title": "A. Supino Reto",
      "config": { "restSeconds": 120 },
      "items": [
        {
          "exerciseRef": "bench-press",
          "prescription": { "sets": 4, "reps": 8, "loadHint": "70% 1RM", "rpe": 8 }
        }
      ]
    }
  ]
}
```

Regras que o prompt de sistema deve impor:

- Usar **apenas `BlockKind` presentes em `allowedBlockKinds`** da modalidade-alvo.
- Preencher **apenas métricas em `trackedMetrics`**.
- Respeitar duração pedida com ±15%, contando descansos.
- Respeitar equipamento disponível e lista de restrições/lesões — **restrição vence intenção**.
- Preferir `exerciseRef` de exercícios **já existentes no catálogo local** (envie a lista de slugs no contexto). Só propor exercício novo quando realmente não houver equivalente.

**B) `defineExercise`** — para cada `exerciseRef` desconhecido, devolve a ficha do exercício incluindo os keypoints de pose da seção 8. Chamadas em lote e **cacheadas permanentemente** no catálogo local: um exercício novo custa uma chamada, uma vez, na vida do app.

### 7.2 Operacional

- BYOK: chave do usuário, guardada localmente, com aviso claro de que fica no dispositivo.
- Tela de config permite escolher provider e modelo.
- **Sem chave, o app é totalmente funcional**: catálogo embutido + templates prontos por modalidade + editor manual. A IA é acelerador, não requisito.
- Todas as chamadas com timeout, retry com backoff e mensagem de erro humana ("Sem conexão — você pode montar o treino manualmente ou usar um template").
- Registre `aiPrompt` no workout para permitir "gerar outro parecido".

---

## 8. Ilustrações dos exercícios

Objetivo: dar ao usuário uma referência visual de **posição do corpo**, não um vídeo nem anatomia realista. Simplicidade é feature.

### 8.1 Abordagem: rig de keypoints → SVG

Cada exercício carrega uma **sequência de poses**. Uma pose é um conjunto de keypoints normalizados; o renderer desenha stick figure com cabeça, torso, membros e implemento.

```ts
interface PoseSequence {
  /** 2 a 4 quadros: normalmente início → meio → fim do movimento. */
  frames: PoseFrame[];
  equipment?: 'barbell' | 'dumbbell' | 'kettlebell' | 'rings' | 'pullup-bar' | 'box' | 'rower' | 'none';
  viewpoint: 'side' | 'front';
}

interface PoseFrame {
  label: string;                      // "início", "fundo", "lockout"
  /** Coordenadas normalizadas 0..1, origem no canto inferior esquerdo. */
  joints: Record<JointName, [number, number]>;
}

type JointName =
  | 'head' | 'neck' | 'chest' | 'pelvis'
  | 'shoulderL' | 'elbowL' | 'wristL'
  | 'shoulderR' | 'elbowR' | 'wristR'
  | 'hipL' | 'kneeL' | 'ankleL'
  | 'hipR' | 'kneeR' | 'ankleR';
```

### 8.2 Renderer (runtime, JS/TS)

- Função pura `renderPose(frame, equipment, opts) → string` (SVG).
- Traço grosso, cantos arredondados, `currentColor` para herdar tema claro/escuro.
- Componente `<ExerciseFigure>` que mostra os quadros lado a lado ou alterna a cada ~1,2 s (animação sutil, respeitando `prefers-reduced-motion`).
- **Zero rede.** SVG é gerado na hora a partir de números que já estão no IndexedDB.
- Validação: rejeitar poses com membros de comprimento absurdo ou joints fora de 0..1; nesse caso, exibir placeholder neutro em vez de um boneco deformado.

### 8.3 Pipeline Python (build-time, opcional mas recomendado)

Você mencionou Python — o lugar certo para ele é o **build**, não o runtime, já que o app é frontend-only:

- `tools/poses/` com um script Python que define as poses do catálogo embutido de forma legível e paramétrica (ângulos de quadril/joelho/cotovelo → keypoints via cinemática direta simples), em vez de coordenadas escritas na mão.
- Saída: `src/data/exercises.generated.json` com catálogo + `PoseSequence`.
- Um segundo alvo opcional gera PNGs de preview em `docs/poses/` só para **inspeção visual** durante o desenvolvimento — o app não consome esses PNGs.
- O script é determinístico e roda em CI; o JSON gerado é commitado para que o build do app não dependa de Python.

### 8.4 Catálogo embutido mínimo

Entregue com pose pronta pelo menos: **CrossFit** — air squat, back squat, front squat, deadlift, thruster, burpee, pull-up, push-up, wall ball, box jump, KB swing, clean, snatch, push press, double-under, row. **Musculação** — supino reto/inclinado, remada curvada, puxada alta, desenvolvimento, rosca direta, tríceps testa, leg press, cadeira extensora, mesa flexora, elevação lateral, stiff. **Calistenia** — pull-up, chin-up, dip, push-up, pike push-up, L-sit, prancha, hollow hold, muscle-up, pistol squat, australian row.

Exercício vindo da IA usa o mesmo schema e entra no mesmo catálogo — indistinguível na UI.

---

## 9. PWA, offline e performance

- Service worker com **precache do app shell + catálogo de exercícios**; runtime cache para o resto.
- Atualização de versão com prompt discreto ("Nova versão disponível — recarregar"), nunca recarga forçada no meio de um treino.
- **Wake Lock API** durante a execução, com fallback silencioso onde não houver suporte.
- Áudio de transição pré-carregado; primeiro toque do usuário destrava o contexto de áudio.
- Alvo: **abrir e estar na tela de pré-treino em < 1 s** em 4G lenta com cache quente.
- IndexedDB com migrações versionadas e **export/import JSON** de todos os dados (o usuário é dono dos dados; isso também é o plano de backup, já que não há servidor).
- Estado do treino em andamento persistido a cada transição de bloco, para sobreviver a um kill do app.

---

## 10. Acessibilidade

- Contraste AA mínimo, inclusive nas cores de modalidade — valide, não assuma.
- Modalidade **nunca é comunicada só por cor**: sempre cor + ícone + texto.
- Suporte a `prefers-reduced-motion` e `prefers-color-scheme`.
- Rótulos ARIA nos timers, com `aria-live` polido nas transições (não anuncie cada segundo).
- Fontes escaláveis; a tela de execução deve continuar utilizável a 200% de zoom.

---

## 11. Fases de entrega

Cada fase é mergeável e deixa o app utilizável.

**Fase 1 — Fundação multimodalidade**
Modelo de dados novo, migração dos dados atuais para `crossfit`, seed das modalidades embutidas, filtro por modalidade na biblioteca. UI de execução ainda a mesma. *Critério: usuário de CrossFit não percebe diferença; dados migrados sem perda.*

**Fase 2 — Gramática e sequenciador genérico**
`BlockKind` completo, telas de execução por kind, `straight_sets` com descanso automático e registro de carga. Criação manual de treino de musculação/calistenia ponta a ponta. *Critério: dá para treinar musculação sem IA e sem gambiarra.*

**Fase 3 — Cadastro de modalidades e agenda**
CRUD de modalidades, editor de agenda com preview semanal e detecção de conflito, preferências de auto-start.

**Fase 4 — Motor de auto-seleção**
`resolveOpening` com suíte de testes cobrindo todos os 8 ramos, banner de motivo, troca em 1 toque, retomada de sessão.

**Fase 5 — Ilustrações**
Rig de pose, renderer SVG, pipeline Python, catálogo embutido com poses, `<ExerciseFigure>` integrado à execução.

**Fase 6 — IA**
BYOK, `generateWorkout` e `defineExercise` com validação de schema, preview editável, ações de refinamento, fallback offline com templates.

**Fase 7 — Histórico e progressão**
Volume por modalidade, evolução de carga, comparação com execução anterior, sugestão de carga baseada no histórico.

---

## 12. Testes exigidos

- **Unitários:** `resolveOpening` — um caso por `ResolutionReason`, mais fuso/DST, virada de meia-noite, agendas sobrepostas, modalidade sem treinos, sessão expirada na janela de retomada.
- **Unitários:** migração de schema, idempotente e reversível.
- **Unitários:** validação do JSON da IA, incluindo payloads malformados, `BlockKind` não permitido e métricas fora da gramática.
- **Unitários:** renderer de pose com keypoints inválidos → placeholder, nunca crash.
- **Integração:** executar um treino completo de cada `BlockKind` com timers mockados.
- **E2E:** abrir o app em três cenários de agenda (inequívoco, ambíguo, sem agenda) e verificar o destino.
- **Manual:** offline total com DevTools — criar sessão, executar, registrar, reabrir.

## 13. Critérios de aceite

1. Usuário com só CrossFit cadastrado abre o app e cai direto no WOD do dia, exatamente como antes.
2. Usuário com CrossFit (seg/qua/sex 6h30) e musculação (ter/qui 19h) abre às 6h20 de uma quarta e cai no CrossFit, com o motivo visível.
3. O mesmo usuário abre às 15h de uma quarta e vê a tela de CrossFit — a janela de hoje é inequívoca — e consegue trocar para musculação em um toque.
4. Usuário com dois treinos agendados na mesma terça vê um seletor **com apenas esses dois**, não com todas as modalidades.
5. Treino de musculação executa com descanso automático entre séries e registro de carga sem sair da tela.
6. Todo exercício exibido tem ilustração, inclusive os criados pela IA, e ela aparece sem rede.
7. Com o dispositivo em modo avião, é possível abrir, executar e registrar um treino completo.
8. Sem chave de IA configurada, é possível criar e executar treinos em todas as modalidades embutidas.
9. Exportar e reimportar os dados reproduz o estado completo do app.

---

## 14. Fora de escopo (nesta rodada)

Sincronização em nuvem, contas de usuário, integração com wearables/GPS, vídeos de exercício, rede social/compartilhamento, planos periodizados de múltiplas semanas, nutrição. Não construa hooks especulativos para isso — mas também não tome decisões de arquitetura que os inviabilizem (o export JSON já é o embrião do sync).

---

## 15. Entregáveis do agente

1. Documento curto com o mapa do código atual e os pontos de acoplamento a CrossFit.
2. Plano de migração de dados com script e testes.
3. Implementação por fases, cada uma com seus testes.
4. `README` atualizado: como rodar o pipeline Python de poses, como adicionar uma modalidade, como adicionar um exercício ao catálogo.
5. Ao final de cada fase, um resumo do que mudou e o que ficou pendente.
