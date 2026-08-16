export const ENV = {
  appUrl: process.env.APP_URL ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  storageDir: process.env.STORAGE_DIR ?? ".storage",
  // GitHub OAuth substituiu o OAuth da Manus. O app é pessoal: só o dono entra.
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  ownerGithubLogin: process.env.OWNER_GITHUB_LOGIN ?? "",
  // Allowlist por e-mail, separada por vírgula. Vazia = ninguém entra: o app é
  // pessoal, então falhar fechado é o padrão certo se a variável sumir.
  allowedEmails: (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
  // OCR opcional: sem a chave, a importação usa o PDF nativo da Anthropic.
  mistralApiKey: process.env.MISTRAL_API_KEY ?? "",
  mistralOcrModel: process.env.MISTRAL_OCR_MODEL ?? "mistral-ocr-latest",
};
