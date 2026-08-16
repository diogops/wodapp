// Geração do PDF de um workout.
//
// Feito no servidor, e não com window.print() no cliente, porque o layout do
// print varia bastante entre Safari iOS, Chrome Android e desktop — e o uso
// principal aqui é justamente o celular. Aqui o resultado é o mesmo em todos.

import PDFDocument from "pdfkit";

type Exercise = {
  name: string;
  prescription?: string | null;
  sets?: string | null;
  reps?: string | null;
  duration?: string | null;
  load?: string | null;
  notes?: string | null;
};

type Section = {
  title: string;
  format?: string | null;
  notes?: string | null;
  exercises?: Exercise[];
};

export type WorkoutForPdf = {
  title: string;
  focus?: string | null;
  level?: string | null;
  suggestedDate?: Date | string | null;
  notes?: string | null;
  sections?: Section[];
};

const INK = "#20231f";
const MUTED = "#6d746a";
const ACCENT = "#e06b3c";
const RULE = "#dedfd6";

function prescriptionOf(exercise: Exercise) {
  if (exercise.prescription) return exercise.prescription;
  return [exercise.sets, exercise.reps, exercise.duration, exercise.load]
    .filter(Boolean)
    .join(" · ");
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function buildWorkoutPdf(workout: WorkoutForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: workout.title } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Cabeçalho
    doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold")
      .text("WORKOUT", { characterSpacing: 2 });
    doc.moveDown(0.3);
    doc.fillColor(INK).fontSize(24).font("Helvetica-Bold").text(workout.title, { width: contentWidth });

    const meta = [workout.focus, workout.level, formatDate(workout.suggestedDate)].filter(Boolean);
    if (meta.length) {
      doc.moveDown(0.4);
      doc.fillColor(MUTED).fontSize(10).font("Helvetica").text(meta.join("  ·  "), { width: contentWidth });
    }

    if (workout.notes) {
      doc.moveDown(0.6);
      doc.fillColor(INK).fontSize(9.5).font("Helvetica-Oblique").text(workout.notes, { width: contentWidth });
    }

    doc.moveDown(0.9);
    doc.strokeColor(RULE).lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.9);

    for (const section of workout.sections ?? []) {
      // Uma seção nunca deve começar no rodapé da página com o título órfão.
      if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage();

      const titleY = doc.y;
      doc.fillColor(INK).fontSize(13).font("Helvetica-Bold")
        .text(section.title, { width: contentWidth * 0.7, continued: false });

      if (section.format) {
        doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold")
          .text(section.format.toUpperCase(), doc.page.margins.left, titleY + 3, {
            width: contentWidth,
            align: "right",
            characterSpacing: 1,
          });
        doc.y = Math.max(doc.y, titleY + 18);
      }

      doc.moveDown(0.35);

      for (const exercise of section.exercises ?? []) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 40) doc.addPage();

        doc.fillColor(INK).fontSize(10.5).font("Helvetica-Bold")
          .text(exercise.name, { width: contentWidth });

        const prescription = prescriptionOf(exercise);
        if (prescription) {
          doc.fillColor(MUTED).fontSize(9.5).font("Helvetica")
            .text(prescription, { width: contentWidth });
        }
        if (exercise.notes) {
          doc.fillColor(MUTED).fontSize(8.5).font("Helvetica-Oblique")
            .text(exercise.notes, { width: contentWidth });
        }
        doc.moveDown(0.45);
      }

      if (section.notes) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 50) doc.addPage();
        doc.fillColor(MUTED).fontSize(8.5).font("Helvetica-Oblique")
          .text(section.notes, { width: contentWidth });
        doc.moveDown(0.4);
      }

      doc.moveDown(0.5);
    }

    doc.end();
  });
}
