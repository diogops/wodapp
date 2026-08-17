// Catálogo de movimentos de CrossFit e capacidades de treino.
//
// Vive em shared/ porque o cliente monta a seleção e o servidor a valida: aceitar
// texto livre no gerador abriria espaço para o prompt ser dirigido pelo usuário.

export const EXERCISE_CATEGORIES = [
  "LPO",
  "Ginástico",
  "Cardio",
  "Pernas e Ag.",
  "Força e Lev.",
  "Core",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export type CatalogExercise = { name: string; category: ExerciseCategory };

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // LPO
  { name: "Snatch", category: "LPO" },
  { name: "Power Snatch", category: "LPO" },
  { name: "Hang Snatch", category: "LPO" },
  { name: "Clean", category: "LPO" },
  { name: "Power Clean", category: "LPO" },
  { name: "Hang Clean", category: "LPO" },
  { name: "Clean and Jerk", category: "LPO" },
  { name: "Push Jerk", category: "LPO" },
  { name: "Split Jerk", category: "LPO" },
  { name: "Thruster", category: "LPO" },
  { name: "Overhead Squat", category: "LPO" },

  // Ginástico
  { name: "Pull-up", category: "Ginástico" },
  { name: "Chest-to-bar", category: "Ginástico" },
  { name: "Bar Muscle-up", category: "Ginástico" },
  { name: "Ring Muscle-up", category: "Ginástico" },
  { name: "Handstand Push-up", category: "Ginástico" },
  { name: "Handstand Walk", category: "Ginástico" },
  { name: "Toes-to-bar", category: "Ginástico" },
  { name: "Knees-to-elbow", category: "Ginástico" },
  { name: "Ring Dip", category: "Ginástico" },
  { name: "Dips nas paralelas", category: "Ginástico" },
  { name: "Push-up", category: "Ginástico" },
  { name: "Rope Climb", category: "Ginástico" },
  { name: "Burpee", category: "Ginástico" },
  { name: "L-Sit", category: "Ginástico" },

  // Cardio
  { name: "Corrida", category: "Cardio" },
  { name: "Remo", category: "Cardio" },
  { name: "Bike", category: "Cardio" },
  { name: "Ski Erg", category: "Cardio" },
  { name: "Double Under", category: "Cardio" },
  { name: "Single Under", category: "Cardio" },
  { name: "Box Jump", category: "Cardio" },
  { name: "Shuttle Run", category: "Cardio" },

  // Agachamentos e pernas
  { name: "Air Squat", category: "Pernas e Ag." },
  { name: "Back Squat", category: "Pernas e Ag." },
  { name: "Front Squat", category: "Pernas e Ag." },
  { name: "Goblet Squat", category: "Pernas e Ag." },
  { name: "Wall Ball", category: "Pernas e Ag." },
  { name: "Lunge", category: "Pernas e Ag." },
  { name: "Walking Lunge", category: "Pernas e Ag." },
  { name: "Box Step-up", category: "Pernas e Ag." },
  { name: "Pistol", category: "Pernas e Ag." },

  // Levantamento e força
  { name: "Deadlift", category: "Força e Lev." },
  { name: "Sumo Deadlift High Pull", category: "Força e Lev." },
  { name: "Bench Press", category: "Força e Lev." },
  { name: "Strict Press", category: "Força e Lev." },
  { name: "Push Press", category: "Força e Lev." },
  { name: "Kettlebell Swing", category: "Força e Lev." },
  { name: "Turkish Get-up", category: "Força e Lev." },
  { name: "Farmer Carry", category: "Força e Lev." },
  { name: "Bent Over Row", category: "Força e Lev." },

  // Core
  { name: "Sit-up", category: "Core" },
  { name: "GHD Sit-up", category: "Core" },
  { name: "Hollow Hold", category: "Core" },
  { name: "Hollow Rocks", category: "Core" },
  { name: "Superman / Arch Hold", category: "Core" },
  { name: "Prancha", category: "Core" },
  { name: "Russian Twist", category: "Core" },
  { name: "V-up", category: "Core" },
  { name: "Dead Bug", category: "Core" },
];

/** O que treinar — capacidades e padrões de movimento, não exercícios. */
export const FOCUS_AREAS = [
  "LPO",
  "Ginástico",
  "Cardio / motor",
  "Força",
  "Potência",
  "Agachamento",
  "Pernas",
  "Braços",
  "Ombros",
  "Costas",
  "Core",
  "Condicionamento metabólico",
  "Resistência muscular",
  "Mobilidade",
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

const EXERCISE_NAMES = new Set(EXERCISE_CATALOG.map(exercise => exercise.name));
const FOCUS_SET = new Set<string>(FOCUS_AREAS);

export const isCatalogExercise = (name: string) => EXERCISE_NAMES.has(name);
export const isFocusArea = (name: string) => FOCUS_SET.has(name);

export function exercisesByCategory(category: ExerciseCategory) {
  return EXERCISE_CATALOG.filter(exercise => exercise.category === category);
}
