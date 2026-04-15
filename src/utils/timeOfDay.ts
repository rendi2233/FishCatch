/**
 * Парсинг значения time_of_day из базы (PostgreSQL array или string).
 */
export function parseTimeOfDay(
  value: string[] | string | null | undefined
): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',').filter((t) => t)
  }
  return [value]
}

/**
 * Режимы отображения времени суток.
 */
export type TimeLabelMode = 'emoji' | 'russian'

/**
 * Возвращает текстовую/эмодзи-метку для времени суток.
 */
export function getTimeLabel(time: string, mode: TimeLabelMode = 'russian'): string {
  if (mode === 'emoji') {
    switch (time) {
      case 'night': return '🌙'
      case 'morning': return '🌅'
      case 'day': return '☀️'
      case 'evening': return '🌇'
      default: return ''
    }
  }

  switch (time) {
    case 'night': return 'Ночь'
    case 'morning': return 'Утро'
    case 'day': return 'День'
    case 'evening': return 'Вечер'
    default: return time
  }
}
