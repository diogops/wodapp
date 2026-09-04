import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("workout demo UI contract", () => {
  it("keeps the demonstration interaction inside the locked workout shell", () => {
    const source = readSource("client/src/pages/Home.tsx");
    expect(source).toContain("Ver demonstração");
    expect(source).toContain('role="dialog" aria-modal="true"');
    expect(source).toContain("setExpandedExercise(null)");
    expect(source).toContain("getWorkoutDemoState(Boolean(expandedExerciseData))");
    expect(source).toContain("workout-mode-main");
    expect(source).toContain("workout-card-body");
    expect(source).toContain("overflow-y-auto");
    expect(source).toContain("Marcar como concluído");
    const headerIndex = source.indexOf("<CardHeader>");
    const bodyIndex = source.indexOf('className="workout-card-body');
    const footerIndex = source.indexOf('border-t border-[#3f463e] bg-[#20231f]');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(bodyIndex).toBeGreaterThan(headerIndex);
    expect(footerIndex).toBeGreaterThan(bodyIndex);
    expect(source).toContain('className="workout-today-grid grid min-h-0 flex-1');
    expect(source).toMatch(/className="[^"]*workout-card-body[^"]*overflow-y-auto[^"]*"/);
    expect(source).not.toContain('workout-mode-main overflow-y-auto');
    expect(source).not.toContain('workout-today-grid overflow-y-auto');
    expect(source).not.toContain('workout-card overflow-y-auto');
    expect(source.match(/overflow-y-auto/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("defines a compact responsive shell with a bounded action footer", () => {
    const styles = readSource("client/src/index.css");
    expect(styles).toContain(".workout-mode .workout-card > .border-t");
    expect(styles).toMatch(/\.workout-mode \.workout-card > \.border-t\s*\{[^}]*flex:\s*0 0 auto;/s);
    expect(styles).toMatch(/\.workout-mode \.workout-card > \.border-t button\s*\{[^}]*min-height:\s*2rem;[^}]*height:\s*2rem;/s);
    // A altura vem de uma cadeia de 100% a partir de html/body/#root, e não de
    // unidade de viewport: `svh` resolvia menor que a tela no PWA standalone do
    // iOS e deixava uma faixa morta abaixo do treino.
    expect(styles).not.toMatch(/\.workout-mode[^{]*\{[^}]*height:\s*100svh/);
    expect(styles).toMatch(/html:has\(\.workout-mode\) #root\s*\{[\s\S]*?height:\s*100%;/);
    expect(styles).toMatch(/\.workout-mode\s*\{[\s\S]*?height:\s*100%;/);
    // Ancorado ao viewport: um deslocamento residual da janela não move o app.
    expect(styles).toMatch(/\.workout-mode\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;/);
    expect(readSource("client/src/pages/Home.tsx")).toContain("isWorkoutLocked(tab, settled)");
    // Safe-area nas duas pontas: barra de status em cima, gestos embaixo.
    expect(styles).toMatch(/env\(safe-area-inset-top\)/);
    expect(styles).toMatch(/env\(safe-area-inset-bottom\)/);
    expect(styles).toMatch(/@media \(min-width: 640px\)[\s\S]*?\.workout-mode \.workout-mode-main\s*\{[\s\S]*?padding:/);
    expect(styles).toMatch(/\.workout-mode \.workout-card-body\s*\{[\s\S]*?min-height:\s*0;/);
    expect(styles).toContain("overflow-y: auto;");
  });

  it("reclaims the mobile viewport: compact global header and no dead card spacing", () => {
    const styles = readSource("client/src/index.css");
    // O cabeçalho global fica visível no celular: é onde se troca a
    // modalidade. Só o nome do app some, para caber numa faixa.
    expect(styles).not.toMatch(/\.workout-mode header\s*\{[\s\S]*?display:\s*none;/);
    expect(styles).toMatch(/@media \(max-width: 639px\)[\s\S]*?\.workout-mode header h1\s*\{[\s\S]*?display:\s*none;/);
    expect(styles).toMatch(/\.workout-mode header \[data-slot="select-trigger"\]\s*\{[\s\S]*?min-width:\s*0;/);
    // A categoria sai do cabeçalho no celular: com dois seletores não cabia.
    expect(styles).toMatch(/@media \(max-width: 639px\)[\s\S]*?header \.app-category-select\s*\{[\s\S]*?display:\s*none;/);
    expect(readSource("client/src/pages/Home.tsx")).toContain('className="app-category-select');
  });

  it("locks the mobile framing: no pinch zoom, no sideways drift", () => {
    // O iOS ignora `maximum-scale`; o que segura o enquadramento é o
    // `touch-action: pan-y` no html mais a guarda de gestos no main.tsx.
    const styles = readSource("client/src/index.css");
    expect(styles).toMatch(/html\s*\{[^}]*touch-action:\s*pan-y;[^}]*overflow-x:\s*clip;/);
    expect(styles).toMatch(/\.workout-mode\s*\{[\s\S]*?touch-action:\s*pan-y;/);
    expect(styles).not.toMatch(/touch-action:\s*manipulation/);
    expect(readSource("client/index.html")).toContain("user-scalable=no");
    expect(readSource("client/src/main.tsx")).toContain("installZoomGuard(window)");
    // Sem o header global, o modo de treino ocupa o viewport inteiro.
    expect(styles).not.toContain("calc(100svh - 2.15rem)");
    // O Card do shadcn traz py-6 + gap-6; ambos precisam ser zerados.
    expect(styles).toMatch(/\.workout-mode \.workout-card\s*\{[^}]*gap:\s*0;/s);
    expect(styles).toMatch(/\.workout-mode \.workout-card\s*\{[^}]*padding-block:\s*0;/s);
  });

  it("compacts the workout title through data-slot, since CardTitle is a div", () => {
    const card = readSource("client/src/components/ui/card.tsx");
    const styles = readSource("client/src/index.css");
    // Guarda contra regressão: se CardTitle voltar a ser um h3, o seletor abaixo
    // deixa de ser necessário — mas enquanto for div, mirar em h3 não compacta nada.
    expect(card).toMatch(/function CardTitle[\s\S]*?<div/);
    expect(card).toContain('data-slot="card-title"');
    expect(styles).toMatch(/\.workout-mode \.workout-card \[data-slot="card-title"\]\s*\{[\s\S]*?font-size:/);
    expect(styles).not.toMatch(/\.workout-mode \.workout-card h3\s*\{/);
  });

  it("keeps every execution control on a single footer row with the progress in the toolbar", () => {
    const source = readSource("client/src/pages/Home.tsx");
    // Rodapé em linha única: empilhar os botões dobrava a altura no celular.
    expect(source).toMatch(/workout-card-actions[^"]*flex-row/);
    expect(source).not.toMatch(/border-t border-\[#3f463e\][^"]*sm:flex-row/);
    // Rodapé enxuto: só Concluir e Pular. O "Próximo" saiu porque o
    // encadeamento do treino agora acontece dentro do timer.
    expect(source).not.toContain("Sortear e abrir outro workout");
    const footerIndex = source.indexOf("workout-card-actions");
    expect(footerIndex).toBeGreaterThan(-1);
    expect(source.indexOf("Pular", footerIndex)).toBeGreaterThan(footerIndex);
    // O contador de progresso foi absorvido pela toolbar da sessão.
    expect(source).toContain("workout-session-counter");
    expect(source).toMatch(/workout-session-status" aria-live="polite"/);
  });
});
