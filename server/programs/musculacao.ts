import type { BlockKind } from "@shared/modalities";
import type { SeedExercise, SeedProgram, SeedSection, SeedWorkout } from "./index";

/**
 * Transcrição de `doc/workouts-crossfit-ilustrados.pdf` — 6 semanas de
 * musculação voltada ao CrossFit (força, mobilidade e drills), 24 treinos:
 * ter/qui/sex fixos e domingo opcional. As doses são as do PDF; não reescreva.
 *
 * O treino não é preso a um dia: o programa tem uma regra de agenda só, para
 * os quatro dias, e o motor de abertura entrega o próximo da fila (o mais
 * antigo sem execução). Faltou à terça, a quinta começa pelo treino da terça.
 *
 * As figuras do PDF eram esquemas genéricos; as de `client/public/demos/
 * musculacao-*.png` são desenhadas por `scripts/draw-demos.py`, uma por nome.
 */

// "4 × 3 · RPE 5–6, desc. 120 s" — o formato de toda prescrição do PDF.
const PRESCRIPTION = /^(\d+) × (.+?) · (RPE [^,]+), desc\. (.+)$/;

const slug = (name: string) =>
  name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ex(name: string, prescription: string, transfer: string, equipment: string, alternative: string): SeedExercise {
  const match = PRESCRIPTION.exec(prescription);
  if (!match) throw new Error(`Prescrição fora do formato: ${name} — ${prescription}`);
  const [, sets, dose, load] = match;
  const timed = / s$/.test(dose);
  return {
    name, prescription, sets, load,
    ...(timed ? { duration: dose } : { reps: dose }),
    notes: `${transfer} Equipamento: ${equipment}. Alternativa: ${alternative}.`,
    imageUrl: `/demos/musculacao-${slug(name)}.jpg`,
  };
}

const FORMAT: Partial<Record<BlockKind, string>> = { warmup: "Aquecimento", superset: "Super-série", cooldown: "Volta à calma" };

const block = (title: string, kind: BlockKind, exercises: SeedExercise[]): SeedSection =>
  ({ title, kind, format: FORMAT[kind] ?? `${exercises[0].sets} × ${exercises[0].reps ?? exercises[0].duration}`, exercises });

const GENERAL = "Aquecimento geral leve de 5 min antes; séries de aproximação não contam e nada vai até a falha.";

const day = (week: number, title: string, focus: string, phase: string, sections: SeedSection[]): SeedWorkout => ({
  title, focus, level: "intermediário", weekday: null, sections,
  notes: `${phase}, semana ${week} de 6.${title.includes("· Dom") ? " Opcional: pular não desequilibra a semana." : ""} ${GENERAL}`,
});

export const MUSCULACAO_PROGRAM: SeedProgram = {
  modalitySlug: "strength",
  sourceFileName: "workouts-crossfit-ilustrados.pdf",
  durationMinutes: 60,
  scheduleWeekdays: [0, 2, 4, 5],
  workouts: [
    day(1, "S1 · Ter — Clean e front rack · quadríceps", "Clean e front rack · quadríceps", "Base técnica", [
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Clean pull", "straight_sets", [
          ex("Clean pull", "4 × 3 · RPE 5–6, desc. 120 s", "Clean: extensão potente de quadril e pernas.", "Barra olímpica", "High pull leve"),
        ]),
        block("Front squat", "straight_sets", [
          ex("Front squat", "5 × 5 · RPE 6, desc. 120 s", "Clean: pernas e sustentação no front rack.", "Barra e rack", "Goblet squat"),
        ]),
        block("Leg press + Lying leg curl", "superset", [
          ex("Leg press", "3 × 10 · RPE 6, desc. 90 s", "Clean e pistols: força de quadríceps.", "Leg press", "Hack squat"),
          ex("Lying leg curl", "3 × 12 · RPE 6, desc. 90 s", "Corrida e clean: força de posteriores.", "Mesa flexora", "Nordic curl assistido"),
        ]),
        block("Spanish squat isometric", "hold", [
          ex("Spanish squat isometric", "3 × 30 s · RPE 6, desc. 90 s", "Agachamentos: tolerância de carga no quadríceps.", "Faixa e suporte", "Wall sit"),
        ]),
        block("Pallof press", "straight_sets", [
          ex("Pallof press", "3 × 10/lado · RPE 6, desc. 90 s", "Clean e ginásticos: anti-rotação.", "Polia ou elástico", "Prancha lateral"),
        ]),
        block("Wrist extension mobility", "cooldown", [
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
    ]),
    day(1, "S1 · Qui — BMU e RMU · puxada e transição", "BMU e RMU · puxada e transição", "Base técnica", [
        block("Scapular pull-up + Arch hold", "warmup", [
          ex("Scapular pull-up", "3 × 8 · RPE 5–6, desc. 90 s", "BMU: controle escapular.", "Barra fixa", "Depressão escapular no puxador"),
          ex("Arch hold", "3 × 25 s · RPE 6, desc. 90 s", "Kipping: controle da posição arch.", "Colchonete", "Superman hold"),
        ]),
        block("Chest-to-bar pull-up", "straight_sets", [
          ex("Chest-to-bar pull-up", "4 × 3 · RPE 5–6, desc. 120 s", "BMU: puxada alta e controle.", "Barra fixa", "Pull-up com elástico"),
        ]),
        block("Strict pull-up", "straight_sets", [
          ex("Strict pull-up", "4 × 5 · RPE 6, desc. 120 s", "BMU: força estrita de puxada.", "Barra fixa", "Lat pulldown"),
        ]),
        block("Lat pulldown + Strict bar dip", "superset", [
          ex("Lat pulldown", "3 × 10 · RPE 6, desc. 90 s", "BMU: dorsal e depressão escapular.", "Puxador", "Pull-up assistido"),
          ex("Strict bar dip", "3 × 6 · RPE 6, desc. 90 s", "BMU e RMU: força de finalização.", "Paralelas", "Tríceps na polia"),
        ]),
        block("Seated cable row", "straight_sets", [
          ex("Seated cable row", "3 × 10 · RPE 6, desc. 90 s", "BMU: controle escapular e puxada horizontal.", "Polia baixa", "Remada com halteres"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 25 s · RPE 6, desc. 90 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
        block("Dead hang", "hold", [
          ex("Dead hang", "3 × 30 s · RPE 6, desc. 90 s", "BMU e TTB: resistência de pegada.", "Barra fixa", "Farmer hold"),
        ]),
    ]),
    day(1, "S1 · Sex — Overhead e HSW · DU e panturrilhas", "Overhead e HSW · DU e panturrilhas", "Base técnica", [
        block("Wall slide + Wrist extension mobility", "warmup", [
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
        block("Overhead squat PVC", "straight_sets", [
          ex("Overhead squat PVC", "3 × 8 · RPE 3–5, desc. 30 s", "Snatch: estabilidade overhead e mobilidade.", "PVC", "Snatch-grip press leve"),
        ]),
        block("Strict press", "straight_sets", [
          ex("Strict press", "4 × 6 · RPE 6, desc. 120 s", "HSPU e overhead: força de ombros.", "Barra olímpica", "Shoulder press com halteres"),
        ]),
        block("Pike push-up + Cable face pull", "superset", [
          ex("Pike push-up", "3 × 8 · RPE 6, desc. 90 s", "HSPU: força vertical de ombro.", "Caixa ou solo", "Shoulder press"),
          ex("Cable face pull", "3 × 12 · RPE 6, desc. 90 s", "Overhead: rotadores externos e escápula.", "Polia e corda", "Face pull com elástico"),
        ]),
        block("Standing calf raise + Seated calf raise", "superset", [
          ex("Standing calf raise", "4 × 12 · RPE 6, desc. 90 s", "DU e corrida: resistência de panturrilha.", "Máquina ou halteres", "Elevação unilateral em degrau"),
          ex("Seated calf raise", "3 × 15 · RPE 6, desc. 90 s", "DU: força do sóleo e tolerância de tornozelo.", "Máquina ou halter", "Sóleo sentado com halter"),
        ]),
        block("Double-under technique drill", "straight_sets", [
          ex("Double-under technique drill", "5 × 20 s · RPE 5–6, desc. 90 s", "DU: ritmo e coordenação de punhos.", "Corda de pular", "Saltos simples com corda"),
        ]),
        block("Wall-facing handstand hold", "hold", [
          ex("Wall-facing handstand hold", "3 × 25 s · RPE 5–6, desc. 90 s", "HSW: alinhamento e estabilidade invertida.", "Parede", "Pike hold no banco"),
        ]),
    ]),
    day(1, "S1 · Dom — Mobilidade · acessórios leves e prevenção", "Mobilidade · acessórios leves e prevenção", "Base técnica", [
        block("90/90 hip switches + Cossack squat", "warmup", [
          ex("90/90 hip switches", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e agachamento: rotação do quadril.", "Colchonete", "Alongamento de piriforme"),
          ex("Cossack squat", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e snatch: mobilidade lateral.", "Solo", "Lateral lunge assistido"),
        ]),
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Cable external rotation + Wall slide", "superset", [
          ex("Cable external rotation", "3 × 12/lado · RPE 3–5, desc. 45 s", "Overhead: manguito rotador.", "Polia", "Rotação externa com elástico"),
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
        ]),
        block("Bulgarian split squat", "straight_sets", [
          ex("Bulgarian split squat", "3 × 8/lado · RPE 3–5, desc. 45 s", "Pistol e joelho: força unilateral.", "Banco e halteres", "Step-up"),
        ]),
        block("Romanian deadlift", "straight_sets", [
          ex("Romanian deadlift", "3 × 8 · RPE 3–5, desc. 45 s", "Clean e corrida: cadeia posterior.", "Barra ou halteres", "Mesa flexora"),
        ]),
        block("Hanging knee raise", "straight_sets", [
          ex("Hanging knee raise", "3 × 10 · RPE 3–5, desc. 45 s", "TTB: flexores do quadril e controle abdominal.", "Barra fixa", "Reverse crunch"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 25 s · RPE 3–5, desc. 45 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
    ]),
    day(2, "S2 · Ter — Clean e front rack · quadríceps", "Clean e front rack · quadríceps", "Base e consistência", [
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Clean pull", "straight_sets", [
          ex("Clean pull", "4 × 3 · RPE 5–6, desc. 120 s", "Clean: extensão potente de quadril e pernas.", "Barra olímpica", "High pull leve"),
        ]),
        block("Front squat", "straight_sets", [
          ex("Front squat", "5 × 5 · RPE 6–7, desc. 120 s", "Clean: pernas e sustentação no front rack.", "Barra e rack", "Goblet squat"),
        ]),
        block("Leg press + Lying leg curl", "superset", [
          ex("Leg press", "3 × 10 · RPE 6–7, desc. 90 s", "Clean e pistols: força de quadríceps.", "Leg press", "Hack squat"),
          ex("Lying leg curl", "3 × 12 · RPE 6–7, desc. 90 s", "Corrida e clean: força de posteriores.", "Mesa flexora", "Nordic curl assistido"),
        ]),
        block("Spanish squat isometric", "hold", [
          ex("Spanish squat isometric", "3 × 35 s · RPE 6–7, desc. 90 s", "Agachamentos: tolerância de carga no quadríceps.", "Faixa e suporte", "Wall sit"),
        ]),
        block("Pallof press", "straight_sets", [
          ex("Pallof press", "3 × 10/lado · RPE 6–7, desc. 90 s", "Clean e ginásticos: anti-rotação.", "Polia ou elástico", "Prancha lateral"),
        ]),
        block("Wrist extension mobility", "cooldown", [
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
    ]),
    day(2, "S2 · Qui — BMU e RMU · puxada e transição", "BMU e RMU · puxada e transição", "Base e consistência", [
        block("Scapular pull-up + Arch hold", "warmup", [
          ex("Scapular pull-up", "3 × 8 · RPE 5–6, desc. 90 s", "BMU: controle escapular.", "Barra fixa", "Depressão escapular no puxador"),
          ex("Arch hold", "3 × 30 s · RPE 6–7, desc. 90 s", "Kipping: controle da posição arch.", "Colchonete", "Superman hold"),
        ]),
        block("Chest-to-bar pull-up", "straight_sets", [
          ex("Chest-to-bar pull-up", "4 × 3 · RPE 5–6, desc. 120 s", "BMU: puxada alta e controle.", "Barra fixa", "Pull-up com elástico"),
        ]),
        block("Strict pull-up", "straight_sets", [
          ex("Strict pull-up", "4 × 5 · RPE 6–7, desc. 120 s", "BMU: força estrita de puxada.", "Barra fixa", "Lat pulldown"),
        ]),
        block("Lat pulldown + Strict bar dip", "superset", [
          ex("Lat pulldown", "3 × 10 · RPE 6–7, desc. 90 s", "BMU: dorsal e depressão escapular.", "Puxador", "Pull-up assistido"),
          ex("Strict bar dip", "3 × 6 · RPE 6–7, desc. 90 s", "BMU e RMU: força de finalização.", "Paralelas", "Tríceps na polia"),
        ]),
        block("Seated cable row", "straight_sets", [
          ex("Seated cable row", "3 × 10 · RPE 6–7, desc. 90 s", "BMU: controle escapular e puxada horizontal.", "Polia baixa", "Remada com halteres"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 30 s · RPE 6–7, desc. 90 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
        block("Dead hang", "hold", [
          ex("Dead hang", "3 × 35 s · RPE 6–7, desc. 90 s", "BMU e TTB: resistência de pegada.", "Barra fixa", "Farmer hold"),
        ]),
    ]),
    day(2, "S2 · Sex — Overhead e HSW · DU e panturrilhas", "Overhead e HSW · DU e panturrilhas", "Base e consistência", [
        block("Wall slide + Wrist extension mobility", "warmup", [
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
        block("Overhead squat PVC", "straight_sets", [
          ex("Overhead squat PVC", "3 × 8 · RPE 3–5, desc. 30 s", "Snatch: estabilidade overhead e mobilidade.", "PVC", "Snatch-grip press leve"),
        ]),
        block("Strict press", "straight_sets", [
          ex("Strict press", "4 × 6 · RPE 6–7, desc. 120 s", "HSPU e overhead: força de ombros.", "Barra olímpica", "Shoulder press com halteres"),
        ]),
        block("Pike push-up + Cable face pull", "superset", [
          ex("Pike push-up", "3 × 8 · RPE 6–7, desc. 90 s", "HSPU: força vertical de ombro.", "Caixa ou solo", "Shoulder press"),
          ex("Cable face pull", "3 × 12 · RPE 6–7, desc. 90 s", "Overhead: rotadores externos e escápula.", "Polia e corda", "Face pull com elástico"),
        ]),
        block("Standing calf raise + Seated calf raise", "superset", [
          ex("Standing calf raise", "4 × 12 · RPE 6–7, desc. 90 s", "DU e corrida: resistência de panturrilha.", "Máquina ou halteres", "Elevação unilateral em degrau"),
          ex("Seated calf raise", "3 × 15 · RPE 6–7, desc. 90 s", "DU: força do sóleo e tolerância de tornozelo.", "Máquina ou halter", "Sóleo sentado com halter"),
        ]),
        block("Double-under technique drill", "straight_sets", [
          ex("Double-under technique drill", "5 × 25 s · RPE 5–6, desc. 90 s", "DU: ritmo e coordenação de punhos.", "Corda de pular", "Saltos simples com corda"),
        ]),
        block("Wall-facing handstand hold", "hold", [
          ex("Wall-facing handstand hold", "3 × 30 s · RPE 5–6, desc. 90 s", "HSW: alinhamento e estabilidade invertida.", "Parede", "Pike hold no banco"),
        ]),
    ]),
    day(2, "S2 · Dom — Mobilidade · acessórios leves e prevenção", "Mobilidade · acessórios leves e prevenção", "Base e consistência", [
        block("90/90 hip switches + Cossack squat", "warmup", [
          ex("90/90 hip switches", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e agachamento: rotação do quadril.", "Colchonete", "Alongamento de piriforme"),
          ex("Cossack squat", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e snatch: mobilidade lateral.", "Solo", "Lateral lunge assistido"),
        ]),
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Cable external rotation + Wall slide", "superset", [
          ex("Cable external rotation", "3 × 12/lado · RPE 3–5, desc. 45 s", "Overhead: manguito rotador.", "Polia", "Rotação externa com elástico"),
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
        ]),
        block("Bulgarian split squat", "straight_sets", [
          ex("Bulgarian split squat", "3 × 8/lado · RPE 3–5, desc. 45 s", "Pistol e joelho: força unilateral.", "Banco e halteres", "Step-up"),
        ]),
        block("Romanian deadlift", "straight_sets", [
          ex("Romanian deadlift", "3 × 8 · RPE 3–5, desc. 45 s", "Clean e corrida: cadeia posterior.", "Barra ou halteres", "Mesa flexora"),
        ]),
        block("Hanging knee raise", "straight_sets", [
          ex("Hanging knee raise", "3 × 10 · RPE 3–5, desc. 45 s", "TTB: flexores do quadril e controle abdominal.", "Barra fixa", "Reverse crunch"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 30 s · RPE 3–5, desc. 45 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
    ]),
    day(3, "S3 · Ter — Clean e front rack · quadríceps", "Clean e front rack · quadríceps", "Progressão I", [
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Clean pull", "straight_sets", [
          ex("Clean pull", "4 × 3 · RPE 5–6, desc. 120 s", "Clean: extensão potente de quadril e pernas.", "Barra olímpica", "High pull leve"),
        ]),
        block("Front squat", "straight_sets", [
          ex("Front squat", "5 × 5 · RPE 7, desc. 120 s", "Clean: pernas e sustentação no front rack.", "Barra e rack", "Goblet squat"),
        ]),
        block("Leg press + Lying leg curl", "superset", [
          ex("Leg press", "3 × 10 · RPE 7, desc. 90 s", "Clean e pistols: força de quadríceps.", "Leg press", "Hack squat"),
          ex("Lying leg curl", "3 × 12 · RPE 7, desc. 90 s", "Corrida e clean: força de posteriores.", "Mesa flexora", "Nordic curl assistido"),
        ]),
        block("Spanish squat isometric", "hold", [
          ex("Spanish squat isometric", "3 × 40 s · RPE 7, desc. 90 s", "Agachamentos: tolerância de carga no quadríceps.", "Faixa e suporte", "Wall sit"),
        ]),
        block("Pallof press", "straight_sets", [
          ex("Pallof press", "3 × 10/lado · RPE 7, desc. 90 s", "Clean e ginásticos: anti-rotação.", "Polia ou elástico", "Prancha lateral"),
        ]),
        block("Wrist extension mobility", "cooldown", [
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
    ]),
    day(3, "S3 · Qui — BMU e RMU · puxada e transição", "BMU e RMU · puxada e transição", "Progressão I", [
        block("Scapular pull-up + Arch hold", "warmup", [
          ex("Scapular pull-up", "3 × 8 · RPE 5–6, desc. 90 s", "BMU: controle escapular.", "Barra fixa", "Depressão escapular no puxador"),
          ex("Arch hold", "3 × 35 s · RPE 7, desc. 90 s", "Kipping: controle da posição arch.", "Colchonete", "Superman hold"),
        ]),
        block("Chest-to-bar pull-up", "straight_sets", [
          ex("Chest-to-bar pull-up", "4 × 3 · RPE 5–6, desc. 120 s", "BMU: puxada alta e controle.", "Barra fixa", "Pull-up com elástico"),
        ]),
        block("Strict pull-up", "straight_sets", [
          ex("Strict pull-up", "5 × 5 · RPE 7, desc. 120 s", "BMU: força estrita de puxada.", "Barra fixa", "Lat pulldown"),
        ]),
        block("Lat pulldown + Strict bar dip", "superset", [
          ex("Lat pulldown", "3 × 10 · RPE 7, desc. 90 s", "BMU: dorsal e depressão escapular.", "Puxador", "Pull-up assistido"),
          ex("Strict bar dip", "3 × 6 · RPE 7, desc. 90 s", "BMU e RMU: força de finalização.", "Paralelas", "Tríceps na polia"),
        ]),
        block("Seated cable row", "straight_sets", [
          ex("Seated cable row", "3 × 10 · RPE 7, desc. 90 s", "BMU: controle escapular e puxada horizontal.", "Polia baixa", "Remada com halteres"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 35 s · RPE 7, desc. 90 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
        block("Dead hang", "hold", [
          ex("Dead hang", "3 × 40 s · RPE 7, desc. 90 s", "BMU e TTB: resistência de pegada.", "Barra fixa", "Farmer hold"),
        ]),
    ]),
    day(3, "S3 · Sex — Overhead e HSW · DU e panturrilhas", "Overhead e HSW · DU e panturrilhas", "Progressão I", [
        block("Wall slide + Wrist extension mobility", "warmup", [
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
        block("Overhead squat PVC", "straight_sets", [
          ex("Overhead squat PVC", "3 × 8 · RPE 3–5, desc. 30 s", "Snatch: estabilidade overhead e mobilidade.", "PVC", "Snatch-grip press leve"),
        ]),
        block("Strict press", "straight_sets", [
          ex("Strict press", "5 × 6 · RPE 7, desc. 120 s", "HSPU e overhead: força de ombros.", "Barra olímpica", "Shoulder press com halteres"),
        ]),
        block("Pike push-up + Cable face pull", "superset", [
          ex("Pike push-up", "3 × 8 · RPE 7, desc. 90 s", "HSPU: força vertical de ombro.", "Caixa ou solo", "Shoulder press"),
          ex("Cable face pull", "3 × 12 · RPE 7, desc. 90 s", "Overhead: rotadores externos e escápula.", "Polia e corda", "Face pull com elástico"),
        ]),
        block("Standing calf raise + Seated calf raise", "superset", [
          ex("Standing calf raise", "4 × 12 · RPE 7, desc. 90 s", "DU e corrida: resistência de panturrilha.", "Máquina ou halteres", "Elevação unilateral em degrau"),
          ex("Seated calf raise", "3 × 15 · RPE 7, desc. 90 s", "DU: força do sóleo e tolerância de tornozelo.", "Máquina ou halter", "Sóleo sentado com halter"),
        ]),
        block("Double-under technique drill", "straight_sets", [
          ex("Double-under technique drill", "5 × 30 s · RPE 5–6, desc. 90 s", "DU: ritmo e coordenação de punhos.", "Corda de pular", "Saltos simples com corda"),
        ]),
        block("Wall-facing handstand hold", "hold", [
          ex("Wall-facing handstand hold", "3 × 35 s · RPE 5–6, desc. 90 s", "HSW: alinhamento e estabilidade invertida.", "Parede", "Pike hold no banco"),
        ]),
    ]),
    day(3, "S3 · Dom — Mobilidade · acessórios leves e prevenção", "Mobilidade · acessórios leves e prevenção", "Progressão I", [
        block("90/90 hip switches + Cossack squat", "warmup", [
          ex("90/90 hip switches", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e agachamento: rotação do quadril.", "Colchonete", "Alongamento de piriforme"),
          ex("Cossack squat", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e snatch: mobilidade lateral.", "Solo", "Lateral lunge assistido"),
        ]),
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Cable external rotation + Wall slide", "superset", [
          ex("Cable external rotation", "3 × 12/lado · RPE 3–5, desc. 45 s", "Overhead: manguito rotador.", "Polia", "Rotação externa com elástico"),
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
        ]),
        block("Bulgarian split squat", "straight_sets", [
          ex("Bulgarian split squat", "3 × 8/lado · RPE 3–5, desc. 45 s", "Pistol e joelho: força unilateral.", "Banco e halteres", "Step-up"),
        ]),
        block("Romanian deadlift", "straight_sets", [
          ex("Romanian deadlift", "3 × 8 · RPE 3–5, desc. 45 s", "Clean e corrida: cadeia posterior.", "Barra ou halteres", "Mesa flexora"),
        ]),
        block("Hanging knee raise", "straight_sets", [
          ex("Hanging knee raise", "3 × 10 · RPE 3–5, desc. 45 s", "TTB: flexores do quadril e controle abdominal.", "Barra fixa", "Reverse crunch"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 35 s · RPE 3–5, desc. 45 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
    ]),
    day(4, "S4 · Ter — Clean e front rack · quadríceps", "Clean e front rack · quadríceps", "Progressão II", [
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Clean pull", "straight_sets", [
          ex("Clean pull", "4 × 3 · RPE 5–6, desc. 120 s", "Clean: extensão potente de quadril e pernas.", "Barra olímpica", "High pull leve"),
        ]),
        block("Front squat", "straight_sets", [
          ex("Front squat", "5 × 5 · RPE 7–8, desc. 120 s", "Clean: pernas e sustentação no front rack.", "Barra e rack", "Goblet squat"),
        ]),
        block("Leg press + Lying leg curl", "superset", [
          ex("Leg press", "3 × 10 · RPE 7–8, desc. 90 s", "Clean e pistols: força de quadríceps.", "Leg press", "Hack squat"),
          ex("Lying leg curl", "3 × 12 · RPE 7–8, desc. 90 s", "Corrida e clean: força de posteriores.", "Mesa flexora", "Nordic curl assistido"),
        ]),
        block("Spanish squat isometric", "hold", [
          ex("Spanish squat isometric", "3 × 45 s · RPE 7–8, desc. 90 s", "Agachamentos: tolerância de carga no quadríceps.", "Faixa e suporte", "Wall sit"),
        ]),
        block("Pallof press", "straight_sets", [
          ex("Pallof press", "3 × 10/lado · RPE 7–8, desc. 90 s", "Clean e ginásticos: anti-rotação.", "Polia ou elástico", "Prancha lateral"),
        ]),
        block("Wrist extension mobility", "cooldown", [
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
    ]),
    day(4, "S4 · Qui — BMU e RMU · puxada e transição", "BMU e RMU · puxada e transição", "Progressão II", [
        block("Scapular pull-up + Arch hold", "warmup", [
          ex("Scapular pull-up", "3 × 8 · RPE 5–6, desc. 90 s", "BMU: controle escapular.", "Barra fixa", "Depressão escapular no puxador"),
          ex("Arch hold", "3 × 40 s · RPE 7–8, desc. 90 s", "Kipping: controle da posição arch.", "Colchonete", "Superman hold"),
        ]),
        block("Chest-to-bar pull-up", "straight_sets", [
          ex("Chest-to-bar pull-up", "4 × 3 · RPE 5–6, desc. 120 s", "BMU: puxada alta e controle.", "Barra fixa", "Pull-up com elástico"),
        ]),
        block("Strict pull-up", "straight_sets", [
          ex("Strict pull-up", "5 × 5 · RPE 7–8, desc. 120 s", "BMU: força estrita de puxada.", "Barra fixa", "Lat pulldown"),
        ]),
        block("Lat pulldown + Strict bar dip", "superset", [
          ex("Lat pulldown", "3 × 10 · RPE 7–8, desc. 90 s", "BMU: dorsal e depressão escapular.", "Puxador", "Pull-up assistido"),
          ex("Strict bar dip", "3 × 6 · RPE 7–8, desc. 90 s", "BMU e RMU: força de finalização.", "Paralelas", "Tríceps na polia"),
        ]),
        block("Seated cable row", "straight_sets", [
          ex("Seated cable row", "3 × 10 · RPE 7–8, desc. 90 s", "BMU: controle escapular e puxada horizontal.", "Polia baixa", "Remada com halteres"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 40 s · RPE 7–8, desc. 90 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
        block("Dead hang", "hold", [
          ex("Dead hang", "3 × 45 s · RPE 7–8, desc. 90 s", "BMU e TTB: resistência de pegada.", "Barra fixa", "Farmer hold"),
        ]),
    ]),
    day(4, "S4 · Sex — Overhead e HSW · DU e panturrilhas", "Overhead e HSW · DU e panturrilhas", "Progressão II", [
        block("Wall slide + Wrist extension mobility", "warmup", [
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
        block("Overhead squat PVC", "straight_sets", [
          ex("Overhead squat PVC", "3 × 8 · RPE 3–5, desc. 30 s", "Snatch: estabilidade overhead e mobilidade.", "PVC", "Snatch-grip press leve"),
        ]),
        block("Strict press", "straight_sets", [
          ex("Strict press", "5 × 6 · RPE 7–8, desc. 120 s", "HSPU e overhead: força de ombros.", "Barra olímpica", "Shoulder press com halteres"),
        ]),
        block("Pike push-up + Cable face pull", "superset", [
          ex("Pike push-up", "3 × 8 · RPE 7–8, desc. 90 s", "HSPU: força vertical de ombro.", "Caixa ou solo", "Shoulder press"),
          ex("Cable face pull", "3 × 12 · RPE 7–8, desc. 90 s", "Overhead: rotadores externos e escápula.", "Polia e corda", "Face pull com elástico"),
        ]),
        block("Standing calf raise + Seated calf raise", "superset", [
          ex("Standing calf raise", "4 × 12 · RPE 7–8, desc. 90 s", "DU e corrida: resistência de panturrilha.", "Máquina ou halteres", "Elevação unilateral em degrau"),
          ex("Seated calf raise", "3 × 15 · RPE 7–8, desc. 90 s", "DU: força do sóleo e tolerância de tornozelo.", "Máquina ou halter", "Sóleo sentado com halter"),
        ]),
        block("Double-under technique drill", "straight_sets", [
          ex("Double-under technique drill", "5 × 35 s · RPE 5–6, desc. 90 s", "DU: ritmo e coordenação de punhos.", "Corda de pular", "Saltos simples com corda"),
        ]),
        block("Wall-facing handstand hold", "hold", [
          ex("Wall-facing handstand hold", "3 × 40 s · RPE 5–6, desc. 90 s", "HSW: alinhamento e estabilidade invertida.", "Parede", "Pike hold no banco"),
        ]),
    ]),
    day(4, "S4 · Dom — Mobilidade · acessórios leves e prevenção", "Mobilidade · acessórios leves e prevenção", "Progressão II", [
        block("90/90 hip switches + Cossack squat", "warmup", [
          ex("90/90 hip switches", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e agachamento: rotação do quadril.", "Colchonete", "Alongamento de piriforme"),
          ex("Cossack squat", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e snatch: mobilidade lateral.", "Solo", "Lateral lunge assistido"),
        ]),
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Cable external rotation + Wall slide", "superset", [
          ex("Cable external rotation", "3 × 12/lado · RPE 3–5, desc. 45 s", "Overhead: manguito rotador.", "Polia", "Rotação externa com elástico"),
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
        ]),
        block("Bulgarian split squat", "straight_sets", [
          ex("Bulgarian split squat", "3 × 8/lado · RPE 3–5, desc. 45 s", "Pistol e joelho: força unilateral.", "Banco e halteres", "Step-up"),
        ]),
        block("Romanian deadlift", "straight_sets", [
          ex("Romanian deadlift", "3 × 8 · RPE 3–5, desc. 45 s", "Clean e corrida: cadeia posterior.", "Barra ou halteres", "Mesa flexora"),
        ]),
        block("Hanging knee raise", "straight_sets", [
          ex("Hanging knee raise", "3 × 10 · RPE 3–5, desc. 45 s", "TTB: flexores do quadril e controle abdominal.", "Barra fixa", "Reverse crunch"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 40 s · RPE 3–5, desc. 45 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
    ]),
    day(5, "S5 · Ter — Clean e front rack · quadríceps", "Clean e front rack · quadríceps", "Intensificação controlada", [
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Clean pull", "straight_sets", [
          ex("Clean pull", "5 × 3 · RPE 5–6, desc. 120 s", "Clean: extensão potente de quadril e pernas.", "Barra olímpica", "High pull leve"),
        ]),
        block("Front squat", "straight_sets", [
          ex("Front squat", "5 × 5 · RPE 8, desc. 120 s", "Clean: pernas e sustentação no front rack.", "Barra e rack", "Goblet squat"),
        ]),
        block("Leg press + Lying leg curl", "superset", [
          ex("Leg press", "3 × 10 · RPE 8, desc. 90 s", "Clean e pistols: força de quadríceps.", "Leg press", "Hack squat"),
          ex("Lying leg curl", "3 × 12 · RPE 8, desc. 90 s", "Corrida e clean: força de posteriores.", "Mesa flexora", "Nordic curl assistido"),
        ]),
        block("Spanish squat isometric", "hold", [
          ex("Spanish squat isometric", "3 × 50 s · RPE 8, desc. 90 s", "Agachamentos: tolerância de carga no quadríceps.", "Faixa e suporte", "Wall sit"),
        ]),
        block("Pallof press", "straight_sets", [
          ex("Pallof press", "3 × 10/lado · RPE 8, desc. 90 s", "Clean e ginásticos: anti-rotação.", "Polia ou elástico", "Prancha lateral"),
        ]),
        block("Wrist extension mobility", "cooldown", [
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
    ]),
    day(5, "S5 · Qui — BMU e RMU · puxada e transição", "BMU e RMU · puxada e transição", "Intensificação controlada", [
        block("Scapular pull-up + Arch hold", "warmup", [
          ex("Scapular pull-up", "3 × 8 · RPE 5–6, desc. 90 s", "BMU: controle escapular.", "Barra fixa", "Depressão escapular no puxador"),
          ex("Arch hold", "3 × 45 s · RPE 8, desc. 90 s", "Kipping: controle da posição arch.", "Colchonete", "Superman hold"),
        ]),
        block("Chest-to-bar pull-up", "straight_sets", [
          ex("Chest-to-bar pull-up", "4 × 3 · RPE 5–6, desc. 120 s", "BMU: puxada alta e controle.", "Barra fixa", "Pull-up com elástico"),
        ]),
        block("Strict pull-up", "straight_sets", [
          ex("Strict pull-up", "5 × 5 · RPE 8, desc. 120 s", "BMU: força estrita de puxada.", "Barra fixa", "Lat pulldown"),
        ]),
        block("Lat pulldown + Strict bar dip", "superset", [
          ex("Lat pulldown", "3 × 10 · RPE 8, desc. 90 s", "BMU: dorsal e depressão escapular.", "Puxador", "Pull-up assistido"),
          ex("Strict bar dip", "3 × 6 · RPE 8, desc. 90 s", "BMU e RMU: força de finalização.", "Paralelas", "Tríceps na polia"),
        ]),
        block("Seated cable row", "straight_sets", [
          ex("Seated cable row", "3 × 10 · RPE 8, desc. 90 s", "BMU: controle escapular e puxada horizontal.", "Polia baixa", "Remada com halteres"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 45 s · RPE 8, desc. 90 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
        block("Dead hang", "hold", [
          ex("Dead hang", "3 × 50 s · RPE 8, desc. 90 s", "BMU e TTB: resistência de pegada.", "Barra fixa", "Farmer hold"),
        ]),
    ]),
    day(5, "S5 · Sex — Overhead e HSW · DU e panturrilhas", "Overhead e HSW · DU e panturrilhas", "Intensificação controlada", [
        block("Wall slide + Wrist extension mobility", "warmup", [
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
          ex("Wrist extension mobility", "2 × 30 s · RPE 3–5, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
        block("Overhead squat PVC", "straight_sets", [
          ex("Overhead squat PVC", "3 × 8 · RPE 3–5, desc. 30 s", "Snatch: estabilidade overhead e mobilidade.", "PVC", "Snatch-grip press leve"),
        ]),
        block("Strict press", "straight_sets", [
          ex("Strict press", "5 × 6 · RPE 8, desc. 120 s", "HSPU e overhead: força de ombros.", "Barra olímpica", "Shoulder press com halteres"),
        ]),
        block("Pike push-up + Cable face pull", "superset", [
          ex("Pike push-up", "3 × 8 · RPE 8, desc. 90 s", "HSPU: força vertical de ombro.", "Caixa ou solo", "Shoulder press"),
          ex("Cable face pull", "3 × 12 · RPE 8, desc. 90 s", "Overhead: rotadores externos e escápula.", "Polia e corda", "Face pull com elástico"),
        ]),
        block("Standing calf raise + Seated calf raise", "superset", [
          ex("Standing calf raise", "4 × 12 · RPE 8, desc. 90 s", "DU e corrida: resistência de panturrilha.", "Máquina ou halteres", "Elevação unilateral em degrau"),
          ex("Seated calf raise", "3 × 15 · RPE 8, desc. 90 s", "DU: força do sóleo e tolerância de tornozelo.", "Máquina ou halter", "Sóleo sentado com halter"),
        ]),
        block("Double-under technique drill", "straight_sets", [
          ex("Double-under technique drill", "5 × 40 s · RPE 5–6, desc. 90 s", "DU: ritmo e coordenação de punhos.", "Corda de pular", "Saltos simples com corda"),
        ]),
        block("Wall-facing handstand hold", "hold", [
          ex("Wall-facing handstand hold", "3 × 45 s · RPE 5–6, desc. 90 s", "HSW: alinhamento e estabilidade invertida.", "Parede", "Pike hold no banco"),
        ]),
    ]),
    day(5, "S5 · Dom — Mobilidade · acessórios leves e prevenção", "Mobilidade · acessórios leves e prevenção", "Intensificação controlada", [
        block("90/90 hip switches + Cossack squat", "warmup", [
          ex("90/90 hip switches", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e agachamento: rotação do quadril.", "Colchonete", "Alongamento de piriforme"),
          ex("Cossack squat", "2 × 8/lado · RPE 3–5, desc. 30 s", "Pistol e snatch: mobilidade lateral.", "Solo", "Lateral lunge assistido"),
        ]),
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 3–5, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 3–5, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Cable external rotation + Wall slide", "superset", [
          ex("Cable external rotation", "3 × 12/lado · RPE 3–5, desc. 45 s", "Overhead: manguito rotador.", "Polia", "Rotação externa com elástico"),
          ex("Wall slide", "2 × 10 · RPE 3–5, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
        ]),
        block("Bulgarian split squat", "straight_sets", [
          ex("Bulgarian split squat", "3 × 8/lado · RPE 3–5, desc. 45 s", "Pistol e joelho: força unilateral.", "Banco e halteres", "Step-up"),
        ]),
        block("Romanian deadlift", "straight_sets", [
          ex("Romanian deadlift", "3 × 8 · RPE 3–5, desc. 45 s", "Clean e corrida: cadeia posterior.", "Barra ou halteres", "Mesa flexora"),
        ]),
        block("Hanging knee raise", "straight_sets", [
          ex("Hanging knee raise", "3 × 10 · RPE 3–5, desc. 45 s", "TTB: flexores do quadril e controle abdominal.", "Barra fixa", "Reverse crunch"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "3 × 45 s · RPE 3–5, desc. 45 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
    ]),
    day(6, "S6 · Ter — Clean e front rack · quadríceps", "Clean e front rack · quadríceps", "Deload e consolidação", [
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 5–6, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 5–6, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Clean pull", "straight_sets", [
          ex("Clean pull", "2 × 3 · RPE 5–6, desc. 120 s", "Clean: extensão potente de quadril e pernas.", "Barra olímpica", "High pull leve"),
        ]),
        block("Front squat", "straight_sets", [
          ex("Front squat", "3 × 5 · RPE 5–6, desc. 120 s", "Clean: pernas e sustentação no front rack.", "Barra e rack", "Goblet squat"),
        ]),
        block("Leg press + Lying leg curl", "superset", [
          ex("Leg press", "2 × 10 · RPE 5–6, desc. 90 s", "Clean e pistols: força de quadríceps.", "Leg press", "Hack squat"),
          ex("Lying leg curl", "2 × 12 · RPE 5–6, desc. 90 s", "Corrida e clean: força de posteriores.", "Mesa flexora", "Nordic curl assistido"),
        ]),
        block("Spanish squat isometric", "hold", [
          ex("Spanish squat isometric", "2 × 30 s · RPE 5–6, desc. 90 s", "Agachamentos: tolerância de carga no quadríceps.", "Faixa e suporte", "Wall sit"),
        ]),
        block("Pallof press", "straight_sets", [
          ex("Pallof press", "2 × 10/lado · RPE 5–6, desc. 90 s", "Clean e ginásticos: anti-rotação.", "Polia ou elástico", "Prancha lateral"),
        ]),
        block("Wrist extension mobility", "cooldown", [
          ex("Wrist extension mobility", "2 × 30 s · RPE 5–6, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
    ]),
    day(6, "S6 · Qui — BMU e RMU · puxada e transição", "BMU e RMU · puxada e transição", "Deload e consolidação", [
        block("Scapular pull-up + Arch hold", "warmup", [
          ex("Scapular pull-up", "2 × 8 · RPE 5–6, desc. 90 s", "BMU: controle escapular.", "Barra fixa", "Depressão escapular no puxador"),
          ex("Arch hold", "2 × 25 s · RPE 5–6, desc. 90 s", "Kipping: controle da posição arch.", "Colchonete", "Superman hold"),
        ]),
        block("Chest-to-bar pull-up", "straight_sets", [
          ex("Chest-to-bar pull-up", "2 × 3 · RPE 5–6, desc. 120 s", "BMU: puxada alta e controle.", "Barra fixa", "Pull-up com elástico"),
        ]),
        block("Strict pull-up", "straight_sets", [
          ex("Strict pull-up", "2 × 5 · RPE 5–6, desc. 120 s", "BMU: força estrita de puxada.", "Barra fixa", "Lat pulldown"),
        ]),
        block("Lat pulldown + Strict bar dip", "superset", [
          ex("Lat pulldown", "2 × 10 · RPE 5–6, desc. 90 s", "BMU: dorsal e depressão escapular.", "Puxador", "Pull-up assistido"),
          ex("Strict bar dip", "2 × 6 · RPE 5–6, desc. 90 s", "BMU e RMU: força de finalização.", "Paralelas", "Tríceps na polia"),
        ]),
        block("Seated cable row", "straight_sets", [
          ex("Seated cable row", "2 × 10 · RPE 5–6, desc. 90 s", "BMU: controle escapular e puxada horizontal.", "Polia baixa", "Remada com halteres"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "2 × 25 s · RPE 5–6, desc. 90 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
        block("Dead hang", "hold", [
          ex("Dead hang", "2 × 30 s · RPE 5–6, desc. 90 s", "BMU e TTB: resistência de pegada.", "Barra fixa", "Farmer hold"),
        ]),
    ]),
    day(6, "S6 · Sex — Overhead e HSW · DU e panturrilhas", "Overhead e HSW · DU e panturrilhas", "Deload e consolidação", [
        block("Wall slide + Wrist extension mobility", "warmup", [
          ex("Wall slide", "2 × 10 · RPE 5–6, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
          ex("Wrist extension mobility", "2 × 30 s · RPE 5–6, desc. 30 s", "Front rack e handstand: extensão de punhos.", "Solo ou banco", "Mobilização na parede"),
        ]),
        block("Overhead squat PVC", "straight_sets", [
          ex("Overhead squat PVC", "3 × 8 · RPE 5–6, desc. 30 s", "Snatch: estabilidade overhead e mobilidade.", "PVC", "Snatch-grip press leve"),
        ]),
        block("Strict press", "straight_sets", [
          ex("Strict press", "2 × 6 · RPE 5–6, desc. 120 s", "HSPU e overhead: força de ombros.", "Barra olímpica", "Shoulder press com halteres"),
        ]),
        block("Pike push-up + Cable face pull", "superset", [
          ex("Pike push-up", "2 × 8 · RPE 5–6, desc. 90 s", "HSPU: força vertical de ombro.", "Caixa ou solo", "Shoulder press"),
          ex("Cable face pull", "2 × 12 · RPE 5–6, desc. 90 s", "Overhead: rotadores externos e escápula.", "Polia e corda", "Face pull com elástico"),
        ]),
        block("Standing calf raise + Seated calf raise", "superset", [
          ex("Standing calf raise", "2 × 12 · RPE 5–6, desc. 90 s", "DU e corrida: resistência de panturrilha.", "Máquina ou halteres", "Elevação unilateral em degrau"),
          ex("Seated calf raise", "2 × 15 · RPE 5–6, desc. 90 s", "DU: força do sóleo e tolerância de tornozelo.", "Máquina ou halter", "Sóleo sentado com halter"),
        ]),
        block("Double-under technique drill", "straight_sets", [
          ex("Double-under technique drill", "3 × 20 s · RPE 5–6, desc. 90 s", "DU: ritmo e coordenação de punhos.", "Corda de pular", "Saltos simples com corda"),
        ]),
        block("Wall-facing handstand hold", "hold", [
          ex("Wall-facing handstand hold", "2 × 25 s · RPE 5–6, desc. 90 s", "HSW: alinhamento e estabilidade invertida.", "Parede", "Pike hold no banco"),
        ]),
    ]),
    day(6, "S6 · Dom — Mobilidade · acessórios leves e prevenção", "Mobilidade · acessórios leves e prevenção", "Deload e consolidação", [
        block("90/90 hip switches + Cossack squat", "warmup", [
          ex("90/90 hip switches", "2 × 8/lado · RPE 5–6, desc. 30 s", "Pistol e agachamento: rotação do quadril.", "Colchonete", "Alongamento de piriforme"),
          ex("Cossack squat", "2 × 8/lado · RPE 5–6, desc. 30 s", "Pistol e snatch: mobilidade lateral.", "Solo", "Lateral lunge assistido"),
        ]),
        block("Front rack stretch + Knee-to-wall ankle mobility", "warmup", [
          ex("Front rack stretch", "2 × 40 s · RPE 5–6, desc. 30 s", "Clean: amplitude de punhos, dorsais e cotovelos.", "Rack e barra", "Alongamento com elástico"),
          ex("Knee-to-wall ankle mobility", "2 × 10/lado · RPE 5–6, desc. 30 s", "Clean e DU: dorsiflexão do tornozelo.", "Parede", "Mobilização com elástico"),
        ]),
        block("Cable external rotation + Wall slide", "superset", [
          ex("Cable external rotation", "2 × 12/lado · RPE 5–6, desc. 45 s", "Overhead: manguito rotador.", "Polia", "Rotação externa com elástico"),
          ex("Wall slide", "2 × 10 · RPE 5–6, desc. 30 s", "Overhead: rotação superior da escápula.", "Parede", "Serratus wall slide com elástico"),
        ]),
        block("Bulgarian split squat", "straight_sets", [
          ex("Bulgarian split squat", "2 × 8/lado · RPE 5–6, desc. 45 s", "Pistol e joelho: força unilateral.", "Banco e halteres", "Step-up"),
        ]),
        block("Romanian deadlift", "straight_sets", [
          ex("Romanian deadlift", "2 × 8 · RPE 5–6, desc. 45 s", "Clean e corrida: cadeia posterior.", "Barra ou halteres", "Mesa flexora"),
        ]),
        block("Hanging knee raise", "straight_sets", [
          ex("Hanging knee raise", "2 × 10 · RPE 5–6, desc. 45 s", "TTB: flexores do quadril e controle abdominal.", "Barra fixa", "Reverse crunch"),
        ]),
        block("Hollow body hold", "hold", [
          ex("Hollow body hold", "2 × 25 s · RPE 5–6, desc. 45 s", "BMU, TTB e HSW: rigidez de tronco.", "Colchonete", "Dead bug"),
        ]),
    ]),
  ],
};
