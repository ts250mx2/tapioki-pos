/**
 * Cliente de HL Console (hl-servidor): de ahi salen el proveedor y el modelo
 * del agente Tapi, y por ahi pasan las llamadas al proveedor de IA.
 *
 * Del .env solo se leen los datos para hablar con HL:
 *   HL_URL     = http://host:3056            (sin diagonal final; HL sirve HTTP plano)
 *   HL_KEY     = hl_ + 48 hex                (Key de acceso de esta app, viaja en el header)
 *   HL_SECRET  = 64 hex                      (secreto compartido; SOLO hace falta en modo llave)
 *   HL_AGENTE  = UUID del agente Tapi
 *   HL_TTL_MIN = 30                          (opcional, minutos de cache)
 *
 * MODO PROXY (el que usa Tapi, igual que Vico): esta aplicacion nunca recibe la
 * llave del proveedor. El SDK oficial apunta a `/api/ws/proxy/<uuid>`
 * (configProxy) y HL inyecta la llave real y fija el modelo del agente. De
 * `/api/ws/llave` solo se toman proveedor y modelo (obtenerAgente), para saber
 * que SDK usar. Si este servidor se compromete, no hay llave de Anthropic que
 * robarle: vive en HL Console.
 *
 * MODO LLAVE (obtenerLlave): HL regresa la llave cifrada con AES-256-GCM y aqui
 * se descifra con HL_SECRET, que nunca viaja por la red. Se conserva porque es
 * el contrato de hl-servidor/cliente/hl-cliente.ts, pero Tapi no lo usa.
 *
 * Sin dependencias: fetch y crypto nativos de Node. Solo del lado servidor:
 * nunca importarlo desde codigo que llegue al navegador.
 *
 * Copia adaptada de hl-servidor/cliente/hl-cliente.ts. Si cambias el modelo o
 * rotas la llave en el portal, Tapi lo toma al vencer el cache (HL_TTL_MIN) o
 * al llamar limpiarCacheLlave().
 */

import { createDecipheriv } from 'node:crypto';

/** Lo que HL sabe del agente. En modo proxy la llave NO viene aqui. */
export interface AgenteIA {
  uuid: string;
  /** Nombre del agente en el portal ("Asistente Tapi"). */
  agente: string;
  proveedor: 'claude' | 'openai' | 'gemini' | 'otro' | string;
  modelo: string;
  caducidad: string | null;
}

export interface LlaveIA extends AgenteIA {
  /** Llave de API ya descifrada, lista para el SDK del proveedor. */
  llave: string;
}

export interface HlClienteConfig {
  url: string;
  key: string;
  /** Secreto compartido en bytes; null si no esta configurado (modo proxy). */
  secreto: Buffer | null;
  agente: string;
  /** Minutos que se conserva la respuesta en memoria. */
  ttlMinutos: number;
  /** Milisegundos maximos de espera por respuesta. */
  timeoutMs: number;
}

interface DatosWs {
  uuid: string;
  agente: string;
  proveedor: string;
  modelo: string;
  llave: string | null;
  llaveCifrada: string | null;
  cifrado: 'aes-256-gcm' | null;
  caducidad: string | null;
}

interface RespuestaWs {
  success: boolean;
  data: DatosWs | null;
  error: string | null;
}

export class HlClienteError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'HlClienteError';
  }
}

const DEFAULT_TTL_MINUTOS = 30;
const DEFAULT_TIMEOUT_MS = 10_000;
const MS_POR_MINUTO = 60_000;
const KEY_FORMAT = /^hl_[0-9a-f]{48}$/;
const SECRET_FORMAT = /^[0-9a-fA-F]{64}$/;
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALGORITMO = 'aes-256-gcm';

function leerConfig(): HlClienteConfig {
  const url = (process.env.HL_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.HL_KEY || '').trim();
  const secretoHex = (process.env.HL_SECRET || '').trim();
  const agente = (process.env.HL_AGENTE || '').trim();
  const ttl = Number(process.env.HL_TTL_MIN);

  if (!url) throw new HlClienteError('Falta HL_URL en el entorno');
  if (!KEY_FORMAT.test(key)) throw new HlClienteError('HL_KEY ausente o con formato invalido (hl_ + 48 hex)');
  if (secretoHex && !SECRET_FORMAT.test(secretoHex)) throw new HlClienteError('HL_SECRET con formato invalido (64 hex)');
  if (!UUID_FORMAT.test(agente)) throw new HlClienteError('HL_AGENTE ausente o no es un UUID valido');

  return {
    url,
    key,
    secreto: secretoHex ? Buffer.from(secretoHex, 'hex') : null,
    agente,
    ttlMinutos: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MINUTOS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

/** Node envuelve la causa real (ECONNREFUSED, TLS, DNS) en "fetch failed"; aqui se saca a la luz. */
function describirErrorRed(error: unknown, baseUrl: string): string {
  const causa = error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
  const mensaje = error instanceof Error ? error.message : 'error de red';
  const detalle = causa ? `${mensaje} (${causa})` : mensaje;
  const pareceTls = /ssl|tls|wrong version|certificate|EPROTO/i.test(causa);
  if (baseUrl.startsWith('https://') && pareceTls) {
    return `${detalle}. HL Console sirve HTTP plano; si no esta detras de un proxy con certificado, usa http:// en HL_URL`;
  }
  return detalle;
}

/** Descifra "iv.tag.cifrado" (base64) producido por HL Console con AES-256-GCM. */
function descifrarLlave(payload: string, secreto: Buffer): string {
  const partes = payload.split('.');
  if (partes.length !== 3) throw new HlClienteError('La llave cifrada no tiene el formato esperado');
  const [iv, tag, cifrado] = partes.map((p) => Buffer.from(p, 'base64'));
  try {
    const decipher = createDecipheriv(ALGORITMO, secreto, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
  } catch {
    throw new HlClienteError('No se pudo descifrar la llave: HL_SECRET no corresponde a esta Key de acceso');
  }
}

function extraerLlave(data: DatosWs, config: HlClienteConfig): string {
  if (data.llaveCifrada) {
    if (!config.secreto) {
      throw new HlClienteError('HL Console regreso la llave cifrada pero falta HL_SECRET en el entorno');
    }
    return descifrarLlave(data.llaveCifrada, config.secreto);
  }
  if (data.llave) return data.llave;
  throw new HlClienteError('HL Console no regreso ninguna llave');
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

/** Lo que manda HL no se confia sin revisar su forma: sin proveedor o sin modelo no sirve. */
function validarDatos(data: unknown): DatosWs | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (!esTexto(d.proveedor) || !esTexto(d.modelo)) return null;
  return {
    uuid: typeof d.uuid === 'string' ? d.uuid : '',
    agente: typeof d.agente === 'string' ? d.agente : '',
    proveedor: d.proveedor.trim().toLowerCase(),
    modelo: d.modelo.trim(),
    llave: typeof d.llave === 'string' ? d.llave : null,
    llaveCifrada: typeof d.llaveCifrada === 'string' ? d.llaveCifrada : null,
    cifrado: d.cifrado === 'aes-256-gcm' ? 'aes-256-gcm' : null,
    caducidad: typeof d.caducidad === 'string' ? d.caducidad : null,
  };
}

async function consultarWs(config: HlClienteConfig): Promise<DatosWs> {
  const url = `${config.url}/api/ws/llave/${config.agente}`;
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { 'X-HL-Key': config.key, Accept: 'application/json' },
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: 'no-store',
    });
  } catch (error) {
    throw new HlClienteError(`No se pudo conectar con HL Console (${url}): ${describirErrorRed(error, config.url)}`);
  }

  let body: RespuestaWs;
  try {
    body = (await response.json()) as RespuestaWs;
  } catch {
    throw new HlClienteError(`HL Console respondio ${response.status} sin JSON valido`, response.status);
  }

  if (!response.ok || !body.success || !body.data) {
    throw new HlClienteError(body.error || `HL Console respondio ${response.status}`, response.status);
  }

  const datos = validarDatos(body.data);
  if (!datos) throw new HlClienteError('HL Console respondio sin proveedor o sin modelo', response.status);
  return datos;
}

interface CacheEntry {
  valor: DatosWs;
  expira: number;
}

let cache: CacheEntry | null = null;
let enCurso: Promise<DatosWs> | null = null;

/**
 * Respuesta cruda de HL, cacheada en memoria durante HL_TTL_MIN minutos; las
 * peticiones simultaneas se juntan en una sola. Si el refresco falla y hay un
 * valor previo, lo reutiliza para no dejar mudo al agente mientras HL vuelve.
 */
async function obtenerDatos(opciones: { forzar?: boolean } = {}): Promise<DatosWs> {
  const ahora = Date.now();
  if (!opciones.forzar && cache && cache.expira > ahora) return cache.valor;
  if (enCurso) return enCurso;

  const config = leerConfig();
  enCurso = consultarWs(config)
    .then((valor) => {
      cache = { valor, expira: Date.now() + config.ttlMinutos * MS_POR_MINUTO };
      return valor;
    })
    .catch((error: unknown) => {
      if (cache) {
        console.error('HL Console: fallo el refresco, se reutiliza lo anterior en cache.', error);
        return cache.valor;
      }
      throw error;
    })
    .finally(() => {
      enCurso = null;
    });

  return enCurso;
}

/**
 * Proveedor y modelo del agente, segun HL. Lo que necesita el MODO PROXY: no
 * toca la llave, asi que no hace falta HL_SECRET.
 */
export async function obtenerAgente(opciones: { forzar?: boolean } = {}): Promise<AgenteIA> {
  const { uuid, agente, proveedor, modelo, caducidad } = await obtenerDatos(opciones);
  return { uuid, agente, proveedor, modelo, caducidad };
}

/**
 * Proveedor, modelo y llave (ya descifrada) del agente. MODO LLAVE: requiere
 * HL_SECRET si la Key de acceso tiene secreto. Tapi corre en modo proxy y no lo
 * usa; se conserva por paridad con hl-servidor/cliente/hl-cliente.ts.
 */
export async function obtenerLlave(opciones: { forzar?: boolean } = {}): Promise<LlaveIA> {
  const datos = await obtenerDatos(opciones);
  const { uuid, agente, proveedor, modelo, caducidad } = datos;
  return { uuid, agente, proveedor, modelo, caducidad, llave: extraerLlave(datos, leerConfig()) };
}

/** Descarta la cache. Util despues de rotar la llave o cambiar el modelo en el portal. */
export function limpiarCacheLlave(): void {
  cache = null;
}

export interface ConfigProxy {
  /** baseURL para el SDK del proveedor; al de OpenAI hay que agregarle /v1. */
  baseURL: string;
  headers: Record<string, string>;
}

/**
 * Configuracion para usar el proxy transparente con el SDK oficial del
 * proveedor. La app nunca recibe la llave: HL Console la inyecta y fija el
 * modelo del agente.
 *
 *   const { baseURL, headers } = configProxy();
 *   new Anthropic({ baseURL, apiKey: 'hl', defaultHeaders: headers });
 */
export function configProxy(): ConfigProxy {
  const url = (process.env.HL_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.HL_KEY || '').trim();
  const agente = (process.env.HL_AGENTE || '').trim();
  if (!url) throw new HlClienteError('Falta HL_URL en el entorno');
  if (!KEY_FORMAT.test(key)) throw new HlClienteError('HL_KEY ausente o con formato invalido (hl_ + 48 hex)');
  if (!UUID_FORMAT.test(agente)) throw new HlClienteError('HL_AGENTE ausente o no es un UUID valido');
  return { baseURL: `${url}/api/ws/proxy/${agente}`, headers: { 'X-HL-Key': key } };
}
