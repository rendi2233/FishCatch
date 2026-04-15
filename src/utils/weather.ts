/**
 * Конвертация атмосферного давления из гПа в мм рт. ст.
 */
export function hpaToMmHg(hpa: number): number {
  return Math.round(hpa * 0.750062)
}
