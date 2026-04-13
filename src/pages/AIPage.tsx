import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AIPage() {
  const [prediction, setPrediction] = useState('')
  const [stats, setStats] = useState({ totalCatches: 0, topFish: '—', avgWeight: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAI()
  }, [])

  const fetchAI = async () => {
    setLoading(true)
    try {
      // 1. Забираем последние записи из базы
      const { data: catches } = await supabase
        .from('catches')
        .select('fish_type, weight, bite_rating, duration_hours')
        .order('catch_date', { ascending: false })
        .limit(100)

      let totalCatches = catches?.length || 0
      let topFish = '—'
      let avgWeight = 0

      if (catches && catches.length > 0) {
        // Считаем самую частую рыбу
        const counts: Record<string, number> = {}
        catches.forEach(c => counts[c.fish_type] = (counts[c.fish_type] || 0) + 1)
        topFish = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b)

        // Средний вес
        const totalWeight = catches.reduce((sum, c) => sum + (c.weight || 0), 0)
        avgWeight = parseFloat((totalWeight / totalCatches).toFixed(2))
      }

      setStats({ totalCatches, topFish, avgWeight })

      // 2. Генерируем прогноз на основе времени и данных
      const hour = new Date().getHours()
      let timeAdvice = hour >= 4 && hour <= 10 
        ? '🌅 Утренний пик активности! Рыба голодна после ночи.' 
        : hour >= 17 && hour <= 21 
        ? '🌇 Вечерний клёв. Хищник выходит на охоту перед закатом.' 
        : '☀️ Дневное затишье. Лучше использовать тихие проводки или ждать смены погоды.'

      let fishAdvice = topFish !== '—'
        ? `📊 Твоя статистика: в этом районе стабильно ловится **${topFish}**. Рекомендую делать упор на приманки под этот вид.`
        : '🆕 Статистики пока мало. Попробуй универсальные варианты: червь, опарыш или вращающаяся блесна.'

      const fullPrediction = `${timeAdvice}\n\n${fishAdvice}\n\n💡 ИИ-совет: Проверь наживку каждые 10–15 минут. Не шуми на берегу и маскируй силуэт. Удачной рыбалки! 🎣`

      setPrediction(fullPrediction)
    } catch (error) {
      console.error('Ошибка ИИ:', error)
      setPrediction('⚠️ Не удалось загрузить данные для анализа. Попробуй обновить.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-center">🤖 ИИ-Прогноз</h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-4xl mb-2">🧠</span>
          <p>Анализирую базу и погоду...</p>
        </div>
      ) : (
        <>
          {/* Карточка прогноза */}
          <div className="bg-white p-5 rounded-2xl shadow border-l-4 border-purple-500 whitespace-pre-line text-gray-700 leading-relaxed">
            {prediction}
          </div>

          {/* Мини-статистика */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCatches}</div>
              <div className="text-xs text-gray-500">Записей</div>
            </div>
            <div className="bg-green-50 p-3 rounded-xl text-center">
              <div className="text-lg font-bold text-green-600 break-words">{stats.topFish}</div>
              <div className="text-xs text-gray-500">Топ вид</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl text-center">
              <div className="text-lg font-bold text-orange-600">{stats.avgWeight} кг</div>
              <div className="text-xs text-gray-500">Ср. вес</div>
            </div>
          </div>

          <button
            onClick={fetchAI}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 active:scale-95 transition"
          >
            🔄 Пересчитать прогноз
          </button>
        </>
      )}
    </div>
  )
}