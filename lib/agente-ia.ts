/**
 * De que corre el agente Tapi: proveedor, modelo y entrada al proxy de HL
 * Console. Mismo patron que el agente Vico de vidaurri-ia.
 *
 * Del .env ya no sale ningun modelo ni ninguna llave de Anthropic: eso se
 * administra en el portal de HL (hl-servidor), agente por agente. Aqui solo se
 * lee con que agente hablar (HL_AGENTE) y con que credencial de app
 * (HL_URL + HL_KEY); ver lib/hl-cliente.ts.
 *
 * Las llamadas van por el PROXY de HL: el SDK oficial apunta a
 * /api/ws/proxy/<uuid> con la key de la app, y HL inyecta la llave real y fija
 * el modelo del agente. Esta aplicacion nunca tiene en memoria una llave de
 * Anthropic; si este servidor se compromete, no hay llave de proveedor que
 * robarle.
 */

import Anthropic from '@anthropic-ai/sdk';
import { HlClienteError, configProxy, obtenerAgente } from './hl-cliente';

/** Proveedores que este agente sabe correr. HL puede asignar otros; ver proveedorSoportado. */
export type ProveedorIA = 'claude';

/** Con que corre un turno: lo que HL dice del agente y su entrada al proxy. */
export interface CredencialIA {
  proveedor: ProveedorIA;
  modelo: string;
  /** Entrada del proxy de HL para este agente; la llave del proveedor no llega aqui. */
  baseURL: string;
  headers: Record<string, string>;
}

/** El SDK exige una llave; la real la pone HL en el proxy. */
const LLAVE_DE_PASO = 'hl';

/** Lo que ve el usuario cuando HL no dio credencial; el detalle va al log. */
export const ERROR_SIN_IA =
  'El servicio de IA no esta disponible en este momento. Intenta de nuevo en unos minutos.';

/** El proveedor que manda HL, si este agente lo sabe correr; null para openai, gemini, otro... */
export function proveedorSoportado(proveedor: string): ProveedorIA | null {
  return proveedor.trim().toLowerCase() === 'claude' ? 'claude' : null;
}

/**
 * Proveedor, modelo y entrada al proxy con que corre Tapi, segun HL. Sube un
 * HlClienteError si HL no contesta (y no hay nada previo en cache) o si asigna
 * un proveedor que aqui no se sabe correr.
 */
export async function credencialDeAgente(opciones: { forzar?: boolean } = {}): Promise<CredencialIA> {
  const { proveedor, modelo } = await obtenerAgente(opciones);
  const soportado = proveedorSoportado(proveedor);
  if (!soportado) {
    throw new HlClienteError(
      `HL Console asigno al agente Tapi el proveedor "${proveedor}", que esta aplicacion no sabe correr (solo claude)`,
    );
  }
  return { proveedor: soportado, modelo, ...configProxy() };
}

export type CredencialParaRuta =
  | { ok: true; credencial: CredencialIA }
  | { ok: false; error: string };

/**
 * Para la ruta del agente: la credencial o un mensaje presentable. Nunca sube:
 * el motivo (HL caido, key invalida, IP no autorizada, llave caducada,
 * proveedor no soportado) queda en el log, que es donde sirve.
 */
export async function credencialParaRuta(): Promise<CredencialParaRuta> {
  try {
    return { ok: true, credencial: await credencialDeAgente() };
  } catch (error) {
    console.error('[hl] sin credencial para el agente Tapi:', error);
    return { ok: false, error: ERROR_SIN_IA };
  }
}

/** Cliente de Anthropic apuntado al proxy de HL: la llave va de paso y HL la sustituye. */
export function clienteAnthropic(credencial: CredencialIA): Anthropic {
  return new Anthropic({
    baseURL: credencial.baseURL,
    apiKey: LLAVE_DE_PASO,
    defaultHeaders: credencial.headers,
  });
}

/** Header con que HL Console codifica el motivo de un rechazo del proxy. */
const HL_ERROR_HEADER = 'x-hl-error';
const PROVEEDOR_CAMBIADO = 'PROVEEDOR_CAMBIADO';

function headerDeError(error: unknown, nombre: string): string | null {
  const headers = (error as { headers?: unknown }).headers;
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(nombre);
  const plano = headers as Record<string, string | undefined>;
  return plano[nombre] ?? plano[nombre.toLowerCase()] ?? null;
}

/**
 * Hubo aviso de HL (422 + X-HL-Error: PROVEEDOR_CAMBIADO) de que el agente ya
 * corre en otro proveedor? Pasa cuando en el portal cambian la llave del agente
 * de Claude a otro proveedor y esta app aun tiene en cache el anterior.
 */
export function esCambioDeProveedor(error: unknown): boolean {
  const status = error instanceof Anthropic.APIError ? error.status : undefined;
  return status === 422 && headerDeError(error, HL_ERROR_HEADER) === PROVEEDOR_CAMBIADO;
}

/** Vuelve a preguntar a HL por el agente saltandose el cache. */
export function refrescarCredencial(): Promise<CredencialIA> {
  return credencialDeAgente({ forzar: true });
}
