import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Modelos disponibles para el asistente Tapi.
 * El usuario elige entre los 3 desde el chat.
 *  - haiku  → el más rápido y económico (sin razonamiento profundo)
 *  - sonnet → equilibrio velocidad / inteligencia
 *  - opus   → el más potente (default)
 */
export type ModelKey = 'haiku' | 'sonnet' | 'opus';

interface ModelConfig {
  id: string;
  label: string;
  /** Soporta thinking adaptativo */
  thinking: boolean;
  /** Soporta el parámetro effort (output_config.effort) */
  effort: boolean;
}

export const MODELS: Record<ModelKey, ModelConfig> = {
  haiku:  { id: 'claude-haiku-4-5',  label: 'Haiku · rápido',      thinking: false, effort: false },
  sonnet: { id: 'claude-sonnet-4-6', label: 'Sonnet · equilibrio', thinking: true,  effort: true  },
  opus:   { id: 'claude-opus-4-8',   label: 'Opus · potente',      thinking: true,  effort: true  },
};

export function resolveModel(key: string | undefined | null): { key: ModelKey; config: ModelConfig } {
  const k: ModelKey = key === 'haiku' || key === 'sonnet' || key === 'opus' ? key : 'opus';
  return { key: k, config: MODELS[k] };
}
