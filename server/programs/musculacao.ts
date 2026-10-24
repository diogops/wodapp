import type { BlockKind } from "@shared/modalities";
import type { SeedExercise, SeedProgram, SeedSection } from "./index";

/**
 * Musculação v2 — 6 semanas de força para o CrossFit numa academia de
 * musculação: barra só no rack ou no Smith (nada sai do chão), halteres,
 * máquinas, polias, barra fixa e paralela. Ter/qui/sex fixos e domingo
 * opcional, 24 treinos. Substituiu a transcrição de
 * `workouts-crossfit-ilustrados.pdf` (migração 0011 apaga a v1).
 *
 * S1–S3 acumulação (variações com pausa ou stiff), S4–S5 intensificação
 * (o segundo exercício do item entra no lugar do primeiro), S6 deload.
 *
 * O treino não é preso a um dia: uma regra de agenda só para os quatro dias,
 * e o motor de abertura entrega o próximo da fila.
 *
 * As demos `client/public/demos/musculacao-*-fases.jpg` (início, meio e fim de
 * cima para baixo) saem de `scripts/generate-demos-gemini.py`; o nome do
 * arquivo é o slug do nome do exercício.
 */

// [nome em português, equipamento, para quê, dica, alternativa]
const CATALOG: Record<string, [string, string, string, string, string]> = {
  "Knee-to-wall ankle mobility": ["Mobilidade de tornozelo na parede", "Parede", "Dorsiflexão para a recepção profunda do clean e do snatch.", "Calcanhar colado no chão; joelho passa por cima do 2º dedo.", "Mobilização com elástico"],
  "Front rack stretch": ["Alongamento de front rack", "Rack e barra", "Cotovelos altos no front rack e na recepção do clean.", "Dedos sob a barra; cotovelos sobem sem perder o tronco ereto.", "Alongamento de tríceps/dorsal com elástico"],
  "Front squat": ["Agachamento frontal", "Barra no rack (com travas de segurança) ou Smith", "Recepção e levantada do clean; tronco ereto sob carga.", "Cotovelos altos o tempo todo; desce controlado, sobe forte.", "Agachamento frontal no Smith"],
  "Scapular pull-up": ["Barra escapular", "Barra fixa", "Ativa a depressão escapular antes de BMU e puxadas.", "Braços retos; só as escápulas sobem e descem.", "Depressão escapular no puxador"],
  "Strict pull-up": ["Barra fixa estrita com carga", "Barra fixa + cinto de anilha", "Força de puxada base do BMU/RMU.", "Sem balanço; queixo acima da barra. Carga só se faz 8 estritas.", "Barra assistida (gravitron) ou puxada alta"],
  "Strict bar dip": ["Paralela com carga", "Paralelas + cinto de anilha", "Força de finalização (press-out) do BMU/RMU.", "Ombro abaixo do cotovelo no fundo; tronco levemente à frente.", "Paralela assistida (gravitron)"],
  "Cable external rotation": ["Rotação externa na polia", "Polia", "Manguito rotador: ombro saudável no overhead e nas argolas.", "Cotovelo colado na costela, toalha entre braço e tronco.", "Rotação externa com elástico"],
  "Cable face pull": ["Face pull na polia", "Polia e corda", "Escápula e rotadores externos para o lockout overhead.", "Puxa a corda para a testa abrindo as mãos, cotovelos altos.", "Crucifixo inverso na máquina"],
  "Standing calf raise": ["Panturrilha em pé na máquina", "Máquina de panturrilha em pé ou Smith", "Gastrocnêmio com joelho estendido: rebote do DU e extensão tripla.", "Pausa de 1 s embaixo alongado; sobe o mais alto possível.", "Panturrilha unilateral no degrau com halter"],
  "90/90 hip switches": ["Troca 90/90", "Colchonete", "Rotação de quadril para pistol e recepção profunda.", "Tronco alto; troca de lado sem apoiar as mãos.", "Alongamento de piriforme"],
  "Bulgarian split squat": ["Agachamento búlgaro", "Banco e halteres", "Força unilateral para pistol e saúde do joelho.", "Joelho de trás quase toca o chão; tronco levemente à frente.", "Búlgaro no Smith"],
  "Romanian deadlift": ["Stiff (levantamento romeno)", "Barra no rack ou halteres", "Posteriores e eretores: a primeira puxada do clean sem tirar a barra do rack.", "Tira a barra do rack em pé; quadril para trás, barra raspando a coxa até abaixo do joelho.", "Stiff com halteres"],
  "Lying leg curl": ["Mesa flexora", "Mesa flexora", "Posteriores do joelho para a puxada e a corrida.", "Quadril colado no banco; desce em 3 s.", "Cadeira flexora"],
  "Wrist extension mobility": ["Mobilidade de punho", "Banco ou colchonete", "Punhos para o front rack, o jerk e o apoio do HSPU.", "Palmas apoiadas com dedos para trás; leva os ombros para trás devagar.", "Alongamento de punho em pé na parede"],
  "Lat pulldown": ["Puxada alta", "Puxador", "Aquece dorsal e escápula antes da barra com carga.", "Peito alto, puxa até a parte de cima do peito, cotovelos para baixo.", "Barra assistida (gravitron)"],
  "Strict press": ["Desenvolvimento militar em pé", "Barra no rack", "Força de ombro sem ajuda das pernas: base do jerk e do HSPU.", "Glúteo e abdômen travados; cabeça passa à frente da barra no topo.", "Desenvolvimento no Smith"],
  "Rack pull": ["Levantamento terra no rack (rack pull)", "Barra no rack, pinos logo abaixo do joelho", "Puxada pesada da posição do clean sem tirar a barra do rack.", "Ombros à frente da barra, costas travadas; termina em pé com o quadril estendido.", "Stiff pesado"],
  "Dumbbell reverse lunge": ["Afundo para trás com halteres", "Halteres", "Pernas unilaterais e estabilidade para pistol, sem impacto no joelho.", "Passo para trás, joelho de trás quase no chão, volta empurrando o pé da frente.", "Afundo no Smith"],
  "Dumbbell shrug": ["Encolhimento com halteres", "Halteres pesados", "Trapézio e pegada: final da puxada do clean e do snatch e sustentação na barra.", "Sobe os ombros em direção às orelhas, pausa 1 s, sem girar.", "Encolhimento no Smith"],
  "Reverse pec deck": ["Crucifixo inverso na máquina", "Máquina voador (peck deck) invertida", "Deltoide posterior e escápula para o lockout overhead.", "Braços quase retos, abre até a linha do ombro, pausa 1 s.", "Crucifixo inverso com halteres no banco inclinado"],
  "Dumbbell goblet squat": ["Agachamento goblet com halter", "Halter", "Aquece quadril e tornozelo na posição de agachamento profundo.", "Halter no peito, cotovelos por dentro dos joelhos, desce até o fundo.", "Agachamento livre sem carga"],
  "Pause front squat": ["Agachamento frontal com pausa", "Barra no rack (com travas de segurança) ou Smith", "Força na posição mais fraca da recepção do clean.", "Pausa de 3 s no fundo sem relaxar; sobe explodindo.", "Front squat com 3 s de descida"],
  "Hack squat": ["Agachamento hack (máquina)", "Máquina hack", "Volume de quadríceps sem carregar a coluna.", "Pés no meio/baixo da plataforma; desce até o fundo.", "Leg press 45°"],
  "Single-leg leg press": ["Leg press 45° unilateral", "Leg press 45°", "Força unilateral profunda para pistol.", "Joelho alinhado ao pé; quadril não descola do banco.", "Agachamento búlgaro"],
  "Seated leg curl": ["Cadeira flexora", "Cadeira flexora", "Posteriores em comprimento longo: proteção na puxada do chão e na corrida.", "Quadril colado no banco, tronco levemente à frente, desce em 3 s.", "Mesa flexora"],
  "Leg extension": ["Cadeira extensora", "Cadeira extensora", "Tendão patelar e VMO: joelho que aguenta agachamento e pistol.", "Segura 2 s em cima com o joelho totalmente estendido.", "Reverse Nordic"],
  "Chest-supported T-bar row": ["Remada cavalinho apoiada", "Máquina cavalinho / T-bar com apoio", "Costas médias e retração escapular para BMU e puxadas.", "Peito no apoio; cotovelos para trás, pausa 1 s.", "Remada serrote"],
  "Straight-arm cable pulldown": ["Pulldown de braços estendidos", "Polia alta e barra reta/corda", "Dorsal com braço reto: o movimento do kip e do giro do BMU.", "Cotovelos quase travados; leva a barra até a coxa contraindo a dorsal.", "Pullover com halter"],
  "Cable hammer curl": ["Rosca martelo na polia (corda)", "Polia baixa e corda", "Braquiorradial e cotovelo: pegada neutra da puxada e do false grip.", "Cotovelos parados ao lado do tronco, polegares para cima.", "Rosca martelo com halteres"],
  "Overhead cable triceps extension": ["Tríceps francês na polia", "Polia e corda", "Tríceps alongado: lockout do jerk e do HSPU.", "Cotovelos apontando para a frente; alonga bem atrás da cabeça.", "Tríceps corda na polia (pushdown)"],
  "Cable crunch": ["Abdominal na polia ajoelhado", "Polia alta e corda", "Flexão de tronco com carga: fecha o T2B e o hollow.", "Quadril parado; enrola a coluna levando os cotovelos aos joelhos.", "Abdominal infra no banco declinado"],
  "Push press": ["Push press", "Barra no rack", "Dip e drive do jerk com carga acima do strict press.", "Dip curto e vertical, calcanhares no chão até o drive.", "Push press com halteres"],
  "Back squat": ["Agachamento livre (barra alta)", "Barra no rack (com travas de segurança)", "Força geral de pernas: base de todo levantamento.", "Barra alta no trapézio, tronco firme, quadril abaixo do joelho.", "Agachamento no Smith"],
  "Snatch-grip Romanian deadlift": ["Stiff com pegada de arranco", "Barra no rack", "Posteriores e costas altas na posição de saída do snatch.", "Pegada larga, ombros sobre a barra, barra raspando a coxa.", "Stiff pegada normal"],
  "Seated dumbbell shoulder press": ["Desenvolvimento com halteres sentado", "Banco 80–90° e halteres", "Volume de ombro com rotação escapular livre, base do HSPU.", "Desce até a altura das orelhas; sobe juntando acima da cabeça.", "Desenvolvimento no Smith inclinado"],
  "45-degree back extension": ["Hiperextensão lombar 45°", "Banco de lombar 45° (com anilha ou halter)", "Eretores e glúteos: costas que seguram o clean e o snatch.", "Quadril na borda da almofada; sobe até alinhar, sem hiperestender.", "Reverse hyper"],
  "Hip thrust": ["Elevação pélvica", "Máquina de hip thrust ou Smith", "Glúteo forte para a extensão final do quadril.", "Queixo no peito, costela baixa, pausa 1 s em cima.", "Elevação pélvica com halter"],
  "Hip adductor machine": ["Cadeira adutora", "Cadeira adutora", "Adutores: joelho e quadril estáveis no agachamento profundo e no pistol.", "Abertura máxima confortável; volta controlada.", "Copenhagen plank"],
  "Hip abduction machine": ["Cadeira abdutora", "Cadeira abdutora", "Glúteo médio: joelho que não entra no agachamento e no pistol.", "Tronco levemente à frente; pausa 1 s aberto.", "Abdução com elástico"],
  "Cable Y-raise": ["Elevação em Y na polia", "Polia baixa", "Trapézio inferior: escápula que sobe no overhead e na parada de mão.", "Braço sobe na diagonal até o Y, polegar para cima.", "Y-raise com halter leve no banco inclinado"],
};

// [exercício S1–S3, exercício S4–S6 (null = o mesmo), prescrição de S1 a S6]
type Item = [string, string | null, string[]];
const DAYS: Array<[string, string, Array<[string, BlockKind, Item[]]>]> = [
  ["Ter", "Agachamento frontal e clean · quadríceps e posteriores", [
    ["Aquecimento específico", "warmup", [
      ["Knee-to-wall ankle mobility", null, ["2 × 10/lado · RPE 3–5, desc. 30 s", "2 × 10/lado · RPE 3–5, desc. 30 s", "2 × 10/lado · RPE 3–5, desc. 30 s", "2 × 10/lado · RPE 3–5, desc. 30 s", "2 × 10/lado · RPE 3–5, desc. 30 s", "2 × 10/lado · RPE 3–5, desc. 30 s"]],
      ["Front rack stretch", null, ["2 × 40 s · RPE 3–5, desc. 30 s", "2 × 40 s · RPE 3–5, desc. 30 s", "2 × 40 s · RPE 3–5, desc. 30 s", "2 × 40 s · RPE 3–5, desc. 30 s", "2 × 40 s · RPE 3–5, desc. 30 s", "2 × 40 s · RPE 3–5, desc. 30 s"]],
    ]],
    ["A · Agachamento frontal", "straight_sets", [
      ["Pause front squat", "Front squat", ["5 × 4 · RPE 7, desc. 120 s", "5 × 4 · RPE 7–8, desc. 120 s", "5 × 3 · RPE 8, desc. 150 s", "5 × 3 · RPE 8, desc. 150 s", "5 × 2 · RPE 8–9, desc. 180 s", "3 × 2 · RPE 7, desc. 120 s"]],
    ]],
    ["B · Puxada (barra saindo do rack)", "straight_sets", [
      ["Romanian deadlift", "Rack pull", ["4 × 6 · RPE 7, desc. 120 s", "4 × 6 · RPE 7–8, desc. 120 s", "4 × 5 · RPE 8, desc. 120 s", "4 × 3 · RPE 8, desc. 120 s", "4 × 2 · RPE 8–9, desc. 150 s", "2 × 2 · RPE 7, desc. 120 s"]],
    ]],
    ["C · Máquina de pernas", "straight_sets", [
      ["Hack squat", "Single-leg leg press", ["3 × 10 · RPE 7, desc. 90 s", "3 × 10 · RPE 8, desc. 90 s", "3 × 8 · RPE 8, desc. 90 s", "3 × 8/lado · RPE 8, desc. 90 s", "3 × 6/lado · RPE 8–9, desc. 90 s", "2 × 6/lado · RPE 7, desc. 90 s"]],
    ]],
    ["D · Posteriores + joelho", "superset", [
      ["Seated leg curl", "Lying leg curl", ["3 × 10 · RPE 7, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 8 · RPE 8, desc. 60 s", "3 × 8 · RPE 8, desc. 60 s", "3 × 6 · RPE 8–9, desc. 60 s", "2 × 6 · RPE 7, desc. 60 s"]],
      ["Leg extension", null, ["3 × 12 · RPE 7, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 8 · RPE 8–9, desc. 60 s", "2 × 10 · RPE 7, desc. 60 s"]],
    ]],
    ["E · Unilateral", "straight_sets", [
      ["Dumbbell reverse lunge", null, ["3 × 10/lado · RPE 7, desc. 90 s", "3 × 10/lado · RPE 8, desc. 90 s", "3 × 12/lado · RPE 8, desc. 90 s", "3 × 8/lado · RPE 8, desc. 90 s", "3 × 8/lado · RPE 8–9, desc. 90 s", "2 × 8/lado · RPE 7, desc. 90 s"]],
    ]],
  ]],
  ["Qui", "Puxada e ginástica · BMU, RMU e T2B", [
    ["Aquecimento específico", "warmup", [
      ["Scapular pull-up", null, ["2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s"]],
      ["Lat pulldown", null, ["2 × 12 · RPE 3–5, desc. 30 s", "2 × 12 · RPE 3–5, desc. 30 s", "2 × 12 · RPE 3–5, desc. 30 s", "2 × 12 · RPE 3–5, desc. 30 s", "2 × 12 · RPE 3–5, desc. 30 s", "2 × 12 · RPE 3–5, desc. 30 s"]],
    ]],
    ["A · Barra + paralela com carga", "superset", [
      ["Strict pull-up", null, ["5 × 5 · RPE 7, desc. 120 s", "5 × 5 · RPE 7–8, desc. 120 s", "5 × 4 · RPE 8, desc. 120 s", "5 × 3 · RPE 8, desc. 150 s", "5 × 2 · RPE 8–9, desc. 150 s", "3 × 2 · RPE 7, desc. 120 s"]],
      ["Strict bar dip", null, ["4 × 6 · RPE 7, desc. 120 s", "4 × 6 · RPE 7–8, desc. 120 s", "4 × 5 · RPE 8, desc. 120 s", "4 × 4 · RPE 8, desc. 150 s", "4 × 3 · RPE 8–9, desc. 150 s", "2 × 3 · RPE 7, desc. 120 s"]],
    ]],
    ["B · Costas + dorsal do kip", "superset", [
      ["Chest-supported T-bar row", null, ["3 × 10 · RPE 7, desc. 90 s", "3 × 10 · RPE 8, desc. 90 s", "3 × 8 · RPE 8, desc. 90 s", "3 × 8 · RPE 8, desc. 90 s", "3 × 6 · RPE 8–9, desc. 90 s", "2 × 6 · RPE 7, desc. 90 s"]],
      ["Straight-arm cable pulldown", null, ["3 × 12 · RPE 7, desc. 90 s", "3 × 12 · RPE 8, desc. 90 s", "3 × 12 · RPE 8, desc. 90 s", "3 × 10 · RPE 8, desc. 90 s", "3 × 10 · RPE 8–9, desc. 90 s", "2 × 10 · RPE 7, desc. 90 s"]],
    ]],
    ["C · Braços para argolas", "superset", [
      ["Cable hammer curl", null, ["3 × 10 · RPE 7, desc. 45 s", "3 × 10 · RPE 8, desc. 45 s", "3 × 12 · RPE 8, desc. 45 s", "3 × 8 · RPE 8, desc. 45 s", "3 × 8 · RPE 8–9, desc. 45 s", "2 × 8 · RPE 7, desc. 45 s"]],
      ["Overhead cable triceps extension", null, ["3 × 12 · RPE 7, desc. 45 s", "3 × 12 · RPE 8, desc. 45 s", "3 × 15 · RPE 8, desc. 45 s", "3 × 10 · RPE 8, desc. 45 s", "3 × 10 · RPE 8–9, desc. 45 s", "2 × 10 · RPE 7, desc. 45 s"]],
    ]],
    ["D · Tronco + pegada", "superset", [
      ["Cable crunch", null, ["3 × 12 · RPE 7, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "3 × 15 · RPE 8, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 10 · RPE 8–9, desc. 60 s", "2 × 10 · RPE 7, desc. 60 s"]],
      ["Dumbbell shrug", null, ["3 × 12 · RPE 7, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "3 × 15 · RPE 8, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 10 · RPE 8–9, desc. 60 s", "2 × 10 · RPE 7, desc. 60 s"]],
    ]],
  ]],
  ["Sex", "Jerk, agachamento e snatch · overhead e HSPU", [
    ["Aquecimento específico", "warmup", [
      ["Cable external rotation", null, ["2 × 12/lado · RPE 3–5, desc. 30 s", "2 × 12/lado · RPE 3–5, desc. 30 s", "2 × 12/lado · RPE 3–5, desc. 30 s", "2 × 12/lado · RPE 3–5, desc. 30 s", "2 × 12/lado · RPE 3–5, desc. 30 s", "2 × 12/lado · RPE 3–5, desc. 30 s"]],
      ["Wrist extension mobility", null, ["2 × 30 s · RPE 3–5, desc. 30 s", "2 × 30 s · RPE 3–5, desc. 30 s", "2 × 30 s · RPE 3–5, desc. 30 s", "2 × 30 s · RPE 3–5, desc. 30 s", "2 × 30 s · RPE 3–5, desc. 30 s", "2 × 30 s · RPE 3–5, desc. 30 s"]],
    ]],
    ["A · Overhead (militar → push press)", "straight_sets", [
      ["Strict press", "Push press", ["4 × 5 · RPE 7, desc. 120 s", "4 × 5 · RPE 7–8, desc. 120 s", "4 × 4 · RPE 8, desc. 120 s", "5 × 3 · RPE 8, desc. 120 s", "5 × 2 · RPE 8–9, desc. 150 s", "3 × 2 · RPE 7, desc. 120 s"]],
    ]],
    ["B · Agachamento livre", "straight_sets", [
      ["Back squat", null, ["4 × 6 · RPE 7, desc. 150 s", "4 × 6 · RPE 7–8, desc. 150 s", "4 × 5 · RPE 8, desc. 150 s", "5 × 3 · RPE 8, desc. 180 s", "5 × 2 · RPE 8–9, desc. 180 s", "3 × 2 · RPE 7, desc. 120 s"]],
    ]],
    ["C · Posição do snatch", "straight_sets", [
      ["Snatch-grip Romanian deadlift", null, ["3 × 6 · RPE 7, desc. 90 s", "3 × 6 · RPE 8, desc. 90 s", "3 × 6 · RPE 8, desc. 90 s", "4 × 5 · RPE 8, desc. 120 s", "4 × 4 · RPE 8–9, desc. 120 s", "2 × 4 · RPE 7, desc. 120 s"]],
    ]],
    ["D · Ombro para HSPU", "superset", [
      ["Seated dumbbell shoulder press", null, ["3 × 10 · RPE 7, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 8 · RPE 8, desc. 60 s", "3 × 8 · RPE 8, desc. 60 s", "3 × 6 · RPE 8–9, desc. 60 s", "2 × 6 · RPE 7, desc. 60 s"]],
      ["Cable face pull", null, ["3 × 15 · RPE 7, desc. 60 s", "3 × 15 · RPE 7, desc. 60 s", "3 × 15 · RPE 8, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "2 × 12 · RPE 7, desc. 60 s"]],
    ]],
    ["E · Cadeia posterior + panturrilha", "superset", [
      ["45-degree back extension", null, ["3 × 10 · RPE 7, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "3 × 8 · RPE 8, desc. 60 s", "3 × 8 · RPE 8–9, desc. 60 s", "2 × 8 · RPE 7, desc. 60 s"]],
      ["Standing calf raise", null, ["3 × 12 · RPE 7, desc. 60 s", "3 × 12 · RPE 8, desc. 60 s", "3 × 15 · RPE 8, desc. 60 s", "3 × 10 · RPE 8, desc. 60 s", "3 × 10 · RPE 8–9, desc. 60 s", "2 × 10 · RPE 7, desc. 60 s"]],
    ]],
  ]],
  ["Dom", "Opcional · unilateral, quadril e ombros saudáveis", [
    ["Aquecimento específico", "warmup", [
      ["90/90 hip switches", null, ["2 × 8/lado · RPE 3–5, desc. 30 s", "2 × 8/lado · RPE 3–5, desc. 30 s", "2 × 8/lado · RPE 3–5, desc. 30 s", "2 × 8/lado · RPE 3–5, desc. 30 s", "2 × 8/lado · RPE 3–5, desc. 30 s", "2 × 8/lado · RPE 3–5, desc. 30 s"]],
      ["Dumbbell goblet squat", null, ["2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s", "2 × 8 · RPE 3–5, desc. 30 s"]],
    ]],
    ["A · Unilateral", "straight_sets", [
      ["Bulgarian split squat", null, ["3 × 8/lado · RPE 7, desc. 90 s", "3 × 8/lado · RPE 7, desc. 90 s", "3 × 10/lado · RPE 8, desc. 90 s", "3 × 6/lado · RPE 8, desc. 90 s", "3 × 6/lado · RPE 8, desc. 90 s", "2 × 6/lado · RPE 7, desc. 90 s"]],
    ]],
    ["B · Glúteo", "straight_sets", [
      ["Hip thrust", null, ["3 × 10 · RPE 7, desc. 90 s", "3 × 10 · RPE 7, desc. 90 s", "3 × 12 · RPE 8, desc. 90 s", "3 × 8 · RPE 8, desc. 90 s", "3 × 8 · RPE 8, desc. 90 s", "2 × 8 · RPE 7, desc. 90 s"]],
    ]],
    ["C · Adutores + glúteo médio", "superset", [
      ["Hip adductor machine", null, ["3 × 12 · RPE 7, desc. 45 s", "3 × 12 · RPE 7, desc. 45 s", "3 × 15 · RPE 8, desc. 45 s", "3 × 12 · RPE 8, desc. 45 s", "3 × 12 · RPE 8, desc. 45 s", "2 × 12 · RPE 7, desc. 45 s"]],
      ["Hip abduction machine", null, ["3 × 15 · RPE 7, desc. 45 s", "3 × 15 · RPE 7, desc. 45 s", "3 × 20 · RPE 8, desc. 45 s", "3 × 15 · RPE 8, desc. 45 s", "3 × 15 · RPE 8, desc. 45 s", "2 × 15 · RPE 7, desc. 45 s"]],
    ]],
    ["D · Ombros saudáveis", "superset", [
      ["Cable Y-raise", null, ["3 × 12 · RPE 6, desc. 45 s", "3 × 12 · RPE 7, desc. 45 s", "3 × 15 · RPE 7, desc. 45 s", "3 × 12 · RPE 7, desc. 45 s", "3 × 12 · RPE 7, desc. 45 s", "2 × 12 · RPE 6, desc. 45 s"]],
      ["Reverse pec deck", null, ["3 × 15 · RPE 6, desc. 45 s", "3 × 15 · RPE 7, desc. 45 s", "3 × 15 · RPE 7, desc. 45 s", "3 × 12 · RPE 7, desc. 45 s", "3 × 12 · RPE 7, desc. 45 s", "2 × 12 · RPE 6, desc. 45 s"]],
    ]],
  ]],
];

const PHASES = ["Acumulação", "Acumulação", "Acumulação +", "Intensificação", "Pico", "Deload"];

// "4 × 3 · RPE 5–6, desc. 120 s" — o formato de toda prescrição.
const PRESCRIPTION = /^(\d+) × (.+?) · (RPE [^,]+), desc\. (.+)$/;

const slug = (name: string) =>
  name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ex(name: string, prescription: string): SeedExercise {
  const match = PRESCRIPTION.exec(prescription);
  if (!match) throw new Error(`Prescrição fora do formato: ${name} — ${prescription}`);
  const [pt, equipment, why, cue, alternative] = CATALOG[name];
  const [, sets, dose, load] = match;
  return {
    name, prescription, sets, load,
    ...(/ s$/.test(dose) ? { duration: dose } : { reps: dose }),
    notes: `${pt}. ${why} Dica: ${cue} Equipamento: ${equipment}. Alternativa: ${alternative}.`,
    imageUrl: `/demos/musculacao-${slug(name)}-fases.jpg`,
  };
}

const FORMAT: Partial<Record<BlockKind, string>> = { warmup: "Aquecimento", superset: "Super-série", cooldown: "Volta à calma" };

const block = (title: string, kind: BlockKind, exercises: SeedExercise[]): SeedSection =>
  ({ title, kind, format: FORMAT[kind] ?? `${exercises[0].sets} × ${exercises[0].reps ?? exercises[0].duration}`, exercises });

const GENERAL = "Aquecimento geral leve de 5 min antes; séries de aproximação não contam e nada vai até a falha. Agachamentos no rack sempre com as travas de segurança.";

export const MUSCULACAO_PROGRAM: SeedProgram = {
  modalitySlug: "strength",
  sourceFileName: "musculacao-v2",
  durationMinutes: 60,
  scheduleWeekdays: [0, 2, 4, 5],
  workouts: PHASES.flatMap((phase, week) =>
    DAYS.map(([day, focus, blocks]) => ({
      title: `S${week + 1} · ${day} — ${focus}`, focus, level: "intermediário", weekday: null,
      notes: `${phase}, semana ${week + 1} de 6.${day === "Dom" ? " Opcional: pular não desequilibra a semana." : ""} ${GENERAL}`,
      sections: blocks.map(([title, kind, items]) => block(title, kind, items.map(([base, late, doses]) => ex(week >= 3 && late ? late : base, doses[week])))),
    }))
  ),
};
