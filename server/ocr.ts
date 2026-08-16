// OCR de PDF via Mistral, usado como primeiro estágio da importação.
//
// Por que existe: a Anthropic lê PDF nativamente, mas para páginas sem camada
// de texto (folha escaneada, foto do quadro) ela depende da visão, e cada
// página vira imagem — até ~4.784 tokens cada. O OCR do Mistral devolve
// markdown preservando o layout por uma fração do custo, e o modelo da
// Anthropic passa a receber texto em vez de imagem.
//
// É deliberadamente opcional: sem MISTRAL_API_KEY, ou se a chamada falhar,
// `ocrPdfToMarkdown` devolve null e a importação segue pelo caminho nativo.

import { Mistral } from "@mistralai/mistralai";
import { ENV } from "./_core/env";

let _client: Mistral | null = null;

function getClient() {
  if (!_client) _client = new Mistral({ apiKey: ENV.mistralApiKey });
  return _client;
}

export function isOcrConfigured() {
  return Boolean(ENV.mistralApiKey);
}

export async function ocrPdfToMarkdown(pdfBase64: string): Promise<string | null> {
  if (!isOcrConfigured()) return null;

  try {
    const result = await getClient().ocr.process({
      model: ENV.mistralOcrModel,
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${pdfBase64}`,
      },
    });

    const markdown = (result.pages ?? [])
      .sort((a, b) => a.index - b.index)
      .map(page => page.markdown)
      .join("\n\n---\n\n")
      .trim();

    if (!markdown) {
      console.warn("[OCR] Mistral retornou markdown vazio; usando o PDF nativo");
      return null;
    }
    return markdown;
  } catch (error) {
    // OCR é um otimizador, não um requisito: falhar aqui não pode derrubar a
    // importação, só devolvê-la ao caminho nativo.
    console.warn("[OCR] Mistral falhou; usando o PDF nativo:", String(error));
    return null;
  }
}
