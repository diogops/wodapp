import { useEffect, useState } from "react";

/**
 * Diagnóstico de ambiente, em /diag.
 *
 * Existe porque os bugs do PWA só aparecem no aparelho: o navegador que eu
 * consigo dirigir daqui não roda em standalone no iOS, e barra de status,
 * safe-area e resolução de unidades de viewport mudam justamente ali. Em vez
 * de deduzir esses valores por um print da tela, esta página os imprime.
 */
type Row = { label: string; value: string };

function readEnv(name: string) {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;visibility:hidden;height:env(${name});`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).height;
  probe.remove();
  return value || "0px";
}

export default function Diagnostics() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const measure = () => {
      const media = (query: string) => (window.matchMedia(query).matches ? "sim" : "não");
      const unit = (value: string) => {
        const probe = document.createElement("div");
        probe.style.cssText = `position:fixed;visibility:hidden;height:${value};`;
        document.body.appendChild(probe);
        const height = getComputedStyle(probe).height;
        probe.remove();
        return height;
      };

      setRows([
        { label: "display-mode: standalone", value: media("(display-mode: standalone)") },
        { label: "navigator.standalone (iOS)", value: String((navigator as any).standalone ?? "indefinido") },
        { label: "innerWidth × innerHeight", value: `${window.innerWidth} × ${window.innerHeight}` },
        { label: "screen", value: `${window.screen.width} × ${window.screen.height}` },
        { label: "devicePixelRatio", value: String(window.devicePixelRatio) },
        { label: "100svh resolve para", value: unit("100svh") },
        { label: "100dvh resolve para", value: unit("100dvh") },
        { label: "100lvh resolve para", value: unit("100lvh") },
        { label: "documentElement.clientHeight", value: `${document.documentElement.clientHeight}px` },
        { label: "safe-area-inset-top", value: readEnv("safe-area-inset-top") },
        { label: "safe-area-inset-bottom", value: readEnv("safe-area-inset-bottom") },
        { label: "service worker", value: "serviceWorker" in navigator ? "suportado" : "ausente" },
        { label: "SW controlando esta página", value: navigator.serviceWorker?.controller ? "sim" : "não" },
        { label: "userAgent", value: navigator.userAgent },
      ]);
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return (
    <div className="app-screen min-h-screen bg-[#f7f7f2] px-4 py-6 text-[#20231f]">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e06b3c]">Diagnóstico</p>
        <h1 className="font-display text-2xl font-semibold">Ambiente do dispositivo</h1>
        <p className="mt-1 text-sm text-[#6d746a]">
          Tire um print desta tela dentro do app instalado.
        </p>

        <dl className="mt-4 divide-y divide-[#dedfd6] rounded-2xl border border-[#dedfd6] bg-white">
          {rows.map(row => (
            <div key={row.label} className="flex flex-col gap-0.5 px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-[#6d746a]">{row.label}</dt>
              <dd className="break-all font-mono text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* Régua visual: mostra onde o app acredita que a tela termina. Se a
            faixa não encostar nas bordas, a altura está sendo calculada errado. */}
        <div className="mt-4 text-xs text-[#6d746a]">
          A faixa abaixo tem 100% da altura declarada. Ela deve encostar no topo e na base.
        </div>
        <div className="fixed inset-y-0 right-0 w-2 bg-[#e06b3c]/70" aria-hidden="true" />
      </div>
    </div>
  );
}
