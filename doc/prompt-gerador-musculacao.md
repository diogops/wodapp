# Meta-prompt — gerador de treinos de Musculação para CrossFit

Cole o texto abaixo numa IA. Ela devolve um PROMPT FINAL; esse prompt final, entregue a
outra IA, gera os treinos em JSON pronto para virar programa no app (modalidade
`strength` / Musculação, ver `shared/modalities.ts` e `server/programs/`).

---

```text
Você é um engenheiro de prompts especialista em programação de treino de força aplicado ao
CrossFit. Sua tarefa NÃO é montar os treinos. É escrever um PROMPT FINAL, completo e
autossuficiente, que eu vou entregar a outra IA para ela gerar os treinos. Entregue só esse
prompt final, pronto para copiar, em português do Brasil.

## Contexto que o prompt final precisa transmitir

APP E MODALIDADE
- Os treinos vão para a modalidade "Musculação" de um app de treino pessoal. Essa modalidade
  hoje está vazia: esta série é o conteúdo dela.
- A Musculação do app é série / repetição / carga / RPE / descanso. Na tela, cada bloco se
  chama "Exercício" e a unidade de trabalho se chama "Série". O atleta avança manualmente
  série a série e registra carga e repetições.
- O atleta já faz CrossFit em outras modalidades do app (WODs). Aqui é academia: força,
  hipertrofia funcional, mobilidade e drills que transferem para os movimentos de CrossFit.
  Nada de condicionamento metabólico.

ATLETA
- Pratica CrossFit, nível intermediário, treina sozinho.
- Academia completa: barra olímpica e anilhas, rack, smith, halteres, kettlebells, polias e
  cabos, crossover, máquinas guiadas (leg press, hack, cadeira extensora e flexora, puxador,
  remada, peck deck, panturrilha), banco romano/GHD, barra fixa, paralelas, caixa, bola
  suíça, elásticos, corda de pular, bike/remo/esteira. Pode não ter argolas: sempre ofereça
  alternativa sem elas.
- Dias de treino: terça, quinta e sexta (fixos) e domingo (OPCIONAL). O domingo precisa ser
  uma sessão que pode ser pulada sem desequilibrar a semana (mobilidade, acessórios leves,
  prevenção de lesão).
- Sessões de 50–60 min.

OBJETIVO
Uma SÉRIE de treinos de fortalecimento, mobilidade e drills direcionados para os movimentos
de CrossFit. Cobrir, no mínimo:
- Clean e front rack: mobilidade de punho, ombro, torácica e tornozelo; força de pernas
  (front squat, leg press, hack); puxada do chão (deadlift, clean pull); recepção.
- Snatch e overhead: estabilidade overhead, escápula, overhead squat, press.
- Bar muscle-up (BMU) e ring muscle-up (RMU): puxada estrita e explosiva (chest-to-bar),
  dorsal no puxador e remada, transição, dip e suporte, tríceps.
- Double-under (DU): panturrilha, tornozelo, pliometria baixa, punho, coordenação.
- Handstand e HSPU: força de ombro, empilhamento, core.
- Toes-to-bar e kipping: pegada, flexores do quadril, core, hollow/arch.
- Pistol e unilaterais: força unilateral, equilíbrio.
- Pegada, core anti-extensão e anti-rotação, posterior de coxa e glúteo (RDL, GHD, flexora),
  e prevenção de lesão (manguito, escápula, joelho, lombar).
Use os aparelhos a favor: máquinas e polias para isolar o elo fraco de cada movimento de
CrossFit, não só a barra. Todo exercício precisa ter uma transferência declarada.

ESTRUTURA DA SÉRIE
- Um bloco de 6 semanas: semanas 1–2 de base, 3–4 de progressão, 5 de pico e 6 de deload.
- Por semana: 3 treinos fixos (ter/qui/sex) e 1 opcional (dom). Total: 24 treinos.
- Cada treino tem um foco principal e um secundário. Quinta e sexta são dias seguidos: não
  repita o mesmo padrão pesado (ex.: puxada pesada, agachamento pesado) nesses dois dias.
- A progressão tem que aparecer nos números de uma semana para a outra: séries, reps,
  carga em % 1RM ou RPE, tempo de isometria, dificuldade da variação.
- Ordem de cada sessão: aquecimento e mobilidade → drill/técnica leve → força principal →
  acessórios (superséries) → isometria/core → volta à calma.

FORMATO DE SAÍDA (o prompt final tem que exigir exatamente isto)
O app guarda cada treino como um workout; cada workout tem seções; cada seção tem
exercícios. O app controla a fila e a agenda e o atleta só marca "feito" ou "pulado". Por
isso cada treino é autocontido. A saída é um único JSON, sem nenhum texto fora dele:

{
  "programName": "string",
  "modalitySlug": "strength",
  "sourceFileName": "string única, ex.: musculacao-crossfit-bloco1",
  "durationMinutes": 60,
  "workouts": [
    {
      "title": "S1 · Ter — Clean e front rack",
      "focus": "frase curta: foco principal e secundário",
      "level": "intermediário",
      "weekday": 2,            // 0=dom, 2=ter, 4=qui, 5=sex
      "week": 1,               // 1–6
      "optional": false,       // true somente no domingo
      "notes": "no máximo duas frases",
      "sections": [
        {
          "title": "Front squat",
          "kind": "straight_sets", // SOMENTE: warmup, straight_sets, superset, hold, cooldown
          "format": "5 × 5",       // texto curto: "4 × 8", "Super-série 3 × 10", "3 × 30 s"
          "notes": "opcional, orientação técnica curta",
          "exercises": [
            {
              "name": "só o nome do movimento",
              "prescription": "≤ 60 caracteres, com o descanso: '5 × 5 @ 75%, desc. 2 min'",
              "sets": "5",
              "reps": "5",
              "duration": "30 s",     // só para isometria/tempo
              "load": "75% 1RM | RPE 7 | halter 16 kg | elástico médio",
              "notes": "transferência: para qual movimento de CrossFit e por quê",
              "equipment": "aparelho usado",
              "alternative": "substituto se o aparelho estiver ocupado ou não existir",
              "imagePrompt": "descrição de uma ilustração simples do movimento, sem texto"
            }
          ]
        }
      ]
    }
  ]
}

Como usar cada tipo de bloco:
- warmup: aquecimento, mobilidade, ativação E os drills técnicos leves (PVC, barra vazia).
- straight_sets: força principal e acessórios isolados, uma seção por exercício.
- superset: exatamente dois exercícios alternados na mesma seção (ideal para máquinas e
  polias, ex.: puxador + tríceps na polia).
- hold: isometrias (hollow, arch, false-grip hang, prancha, handstand hold).
- cooldown: volta à calma e alongamento.

REGRAS DE FORMATO (inegociáveis: o treino é lido no celular entre uma série e outra)
- Um movimento por item em "exercises". Nunca junte dois movimentos num item e nunca
  descreva um bloco em texto corrido.
- "prescription" curta. Preencha sets, reps, duration e load separadamente; deixe vazio o
  que não se aplica.
- O descanso entre séries aparece sempre na prescription.
- Carga sempre concreta (% 1RM, RPE, kg ou cor do elástico). Nada de "a critério".
- Proibido usar AMRAP, EMOM, For Time, Tabata, circuitos ou intervalados: a modalidade
  Musculação do app não aceita esses blocos.
- No máximo 8 seções por treino, cabendo em 50–60 min com os descansos.
- Nomes de movimento no padrão usado no CrossFit e na academia (em inglês quando é o uso
  corrente: "Front squat", "Strict pull-up", "Lat pulldown"); todo o resto em português.

O prompt final também deve pedir à IA que, antes de responder:
- confira que todo "kind" está na lista permitida e que o JSON é válido;
- confira que existem exatamente 6 semanas × 4 treinos, com optional=true só no domingo;
- confira a cobertura: cada objetivo da lista aparece pelo menos uma vez a cada duas semanas;
- confira que quinta e sexta não repetem o mesmo padrão pesado;
- não invente métricas que o atleta não consegue medir sozinho;
- se o JSON completo não couber numa resposta, gere duas semanas por vez, mantendo o mesmo
  sourceFileName, e avise no fim qual é a próxima parte.
```
