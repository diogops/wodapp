export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// A sessão não expira por tempo — só o logout a encerra. O JWT é emitido sem
// claim `exp`; este valor existe apenas para o cookie sobreviver ao fechamento
// do navegador (cookie de sessão sumiria ao fechar a aba).
export const SESSION_MAX_AGE_MS = ONE_YEAR_MS * 10;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
