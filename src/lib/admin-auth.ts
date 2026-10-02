/**
 * Acceso de administradores — independiente de Lovable.
 *
 * Cada administrador crea su propio usuario y contraseña desde /admin.
 * Las contraseñas nunca se guardan en texto plano: se almacena un hash
 * PBKDF2-SHA256 con sal aleatoria.
 *
 * IMPORTANTE: mientras no exista un backend, las cuentas viven en el
 * navegador de cada dispositivo (localStorage). Es un control de acceso de
 * interfaz, no una barrera de seguridad real: quien tenga acceso al
 * navegador puede manipularlo. Para producción, sustituye este archivo por
 * una implementación con Supabase Auth (u otro proveedor) que cumpla la
 * misma interfaz `AdminAuth`; ni /admin ni el panel necesitan más cambios.
 */

export type AdminAuth = {
  /** ¿Existe al menos un administrador? */
  hasAdmins(): boolean;
  /** Crea un administrador. El primero que se crea inicia sesión automáticamente. */
  createAdmin(username: string, password: string): Promise<AuthResult>;
  login(username: string, password: string): Promise<AuthResult>;
  logout(): void;
  /** Usuario con sesión activa, o null. */
  currentUser(): string | null;
  changePassword(current: string, next: string): Promise<AuthResult>;
  listAdmins(): string[];
  removeAdmin(username: string): AuthResult;
};

export type AuthResult = { ok: true } | { ok: false; error: string };

type Account = { username: string; salt: string; hash: string; iterations: number };
type Session = { username: string; expires: number };

const ACCOUNTS_KEY = "caiman-admin-accounts-v1";
const SESSION_KEY = "caiman-admin-session-v1";
const SESSION_MS = 1000 * 60 * 60 * 24 * 7; // 7 días
const ITERATIONS = 210_000;
export const MIN_PASSWORD_LENGTH = 8;

const fail = (error: string): AuthResult => ({ ok: false, error });
const ok: AuthResult = { ok: true };
const normalize = (username: string) => username.trim().toLowerCase();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => Uint8Array.from(hex.match(/.{2}/g) ?? [], (h) => parseInt(h, 16));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

function sameBytes(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function buildAccount(username: string, password: string): Promise<Account> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { username, salt: toHex(salt), hash: toHex(await derive(password, salt, ITERATIONS)), iterations: ITERATIONS };
}

const accounts = () => read<Account[]>(ACCOUNTS_KEY, []);

function startSession(username: string) {
  write(SESSION_KEY, { username, expires: Date.now() + SESSION_MS } satisfies Session);
}

function validate(username: string, password: string): string | null {
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.";
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  return null;
}

export const adminAuth: AdminAuth = {
  hasAdmins: () => accounts().length > 0,

  async createAdmin(rawUsername, password) {
    const username = normalize(rawUsername);
    const problem = validate(username, password);
    if (problem) return fail(problem);
    const list = accounts();
    if (list.some((a) => a.username === username)) return fail("Ese usuario ya existe.");
    const account = await buildAccount(username, password);
    write(ACCOUNTS_KEY, [...list, account]);
    if (list.length === 0) startSession(username);
    return ok;
  },

  async login(rawUsername, password) {
    const username = normalize(rawUsername);
    const account = accounts().find((a) => a.username === username);
    // Se calcula el hash aunque el usuario no exista para no revelar qué usuarios hay.
    const salt = account ? fromHex(account.salt) : crypto.getRandomValues(new Uint8Array(16));
    const hash = toHex(await derive(password, salt, account?.iterations ?? ITERATIONS));
    if (!account || !sameBytes(hash, account.hash)) return fail("Usuario o contraseña incorrectos.");
    startSession(username);
    return ok;
  },

  logout() {
    window.localStorage.removeItem(SESSION_KEY);
  },

  currentUser() {
    const session = read<Session | null>(SESSION_KEY, null);
    if (!session || session.expires < Date.now()) return null;
    return accounts().some((a) => a.username === session.username) ? session.username : null;
  },

  async changePassword(current, next) {
    const username = this.currentUser();
    if (!username) return fail("Tu sesión ha caducado. Vuelve a entrar.");
    if (next.length < MIN_PASSWORD_LENGTH) return fail(`La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    const account = accounts().find((a) => a.username === username);
    if (!account) return fail("No se encontró tu cuenta.");
    const hash = toHex(await derive(current, fromHex(account.salt), account.iterations));
    if (!sameBytes(hash, account.hash)) return fail("La contraseña actual no es correcta.");
    const updated = await buildAccount(username, next);
    write(ACCOUNTS_KEY, accounts().map((a) => (a.username === username ? updated : a)));
    return ok;
  },

  listAdmins: () => accounts().map((a) => a.username),

  removeAdmin(username) {
    const list = accounts();
    if (list.length <= 1) return fail("Debe quedar al menos un administrador.");
    if (username === this.currentUser()) return fail("No puedes eliminar tu propia cuenta mientras la usas.");
    write(ACCOUNTS_KEY, list.filter((a) => a.username !== username));
    return ok;
  },
};
