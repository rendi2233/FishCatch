import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { hpaToMmHg } from '../utils/weather'
import { calculateDistance } from '../utils/geo'

type PredictionMode = 'weather' | 'personal' | 'collective'

export default function AIPage() {
  const [prediction, setPrediction] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<PredictionMode>('collective')
  const [weather, setWeather] = useState<any>(null)
  const [forecast, setForecast] = useState<any[]>([])
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
  const [locating, setLocating] = useState(false)
  const [radiusKm, setRadiusKm] = useState(15)
  const navigate = useNavigate()

  // Определяем геолокацию при загрузке
  useEffect(() => {
    fetchUserLocation()
  }, [])

  const fetchUserLocation = () => {
    setLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          setUserLocation(newLocation)
          console.log('📍 Location updated:', newLocation)
          setLocating(false)
        },
        (error) => {
          console.error('Geolocation error:', error)
          setUserLocation({ lat: 55.75, lon: 37.61 })
          setLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setUserLocation({ lat: 55.75, lon: 37.61 })
      setLocating(false)
    }
  }

  // Получаем погоду и прогноз
  useEffect(() => {
    const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
    
    if (!API_KEY) {
      console.warn('⚠️ OpenWeather API key not found!')
      setApiKeyMissing(true)
      return
    }

    const fetchWeatherData = async () => {
      try {
        const lat = userLocation?.lat || 55.75
        const lon = userLocation?.lon || 37.61

        const currentRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`
        )
        if (!currentRes.ok) throw new Error(`Weather API error: ${currentRes.status}`)
        const currentData = await currentRes.json()
        const pressureMmHg = hpaToMmHg(currentData.main.pressure)
        
        setWeather({
          temp: currentData.main.temp,
          pressure: pressureMmHg,
          pressureHpa: currentData.main.pressure,
          humidity: currentData.main.humidity,
          wind: currentData.wind.speed,
          description: currentData.weather[0].description,
          city: currentData.name,
          date: new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
        })

        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`
        )
        if (!forecastRes.ok) throw new Error(`Forecast API error: ${forecastRes.status}`)
        const forecastData = await forecastRes.json()
        
        const dailyForecast = forecastData.list
          .filter((item: any) => item.dt_txt.includes('12:00:00'))
          .slice(0, 3)
          .map((day: any, _index: number) => {
            const date = new Date(day.dt * 1000)
            const pressureMmHg = hpaToMmHg(day.main.pressure)
            return {
              date: date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
              fullDate: date.toISOString().split('T')[0],
              temp: day.main.temp,
              tempMin: day.main.temp_min,
              tempMax: day.main.temp_max,
              pressure: pressureMmHg,
              pressureHpa: day.main.pressure,
              humidity: day.main.humidity,
              wind: day.wind.speed,
              description: day.weather[0].description,
            }
          })
        
        setForecast(dailyForecast)
        setApiKeyMissing(false)
      } catch (_error) {
        setApiKeyMissing(true)
      }
    }

    if (userLocation) fetchWeatherData()
  }, [userLocation])

  // Получение уловов в радиусе
  const getCatchesInRadius = async (lat: number, lon: number, radiusKm: number = 10) => {
    try {
      console.log('📍 Searching catches near:', lat, lon, 'within', radiusKm, 'km')
      
      const { data, error } = await supabase
        .from('catches')
        .select(`fish_type, weight, bite_rating, lure_type, lure_color, catch_date, location_lat, location_lng, time_of_day, notes, user_id`)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)
        .order('catch_date', { ascending: false })
        .limit(200)

      if (error) throw error
      const catches = data || []
      const filteredCatches = catches.filter((c: any) => {
        if (!c.location_lat || !c.location_lng) return false
        return calculateDistance(lat, lon, c.location_lat, c.location_lng) <= radiusKm
      })
      console.log('✅ Catches within radius:', filteredCatches.length)
      return filteredCatches
    } catch (error) {
      console.error('Error fetching catches:', error)
      return []
    }
  }

  // Получение исторической погоды
  const getHistoricalWeather = async (lat: number, lon: number, date: string) => {
    try {
      const dateOnly = date.split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      const isPast = dateOnly < today
      
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        start_date: dateOnly,
        end_date: dateOnly,
        daily: 'temperature_2m_max,weather_code',
        timezone: 'auto'
      })
      
      const apiUrl = isPast 
        ? `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`
        : `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      
      const res = await fetch(apiUrl)
      if (!res.ok) return null
      const data = await res.json()
      
      const pressureHpa = data.daily?.surface_pressure?.[0]
      const pressureMmHg = pressureHpa ? hpaToMmHg(pressureHpa) : null
      
      return {
        temp: data.daily?.temperature_2m_max?.[0] || data.daily?.temperature_2m_mean?.[0] || null,
        pressure: pressureMmHg,
        pressureHpa: pressureHpa,
        weatherCode: data.daily?.weather_code?.[0],
      }
    } catch (_error) {
      return null
    }
  }

  const generatePrediction = async () => {
    setLoading(true)
    setPrediction('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        alert('🔐 Пожалуйста, войдите!')
        navigate('/login')
        return
      }

      const currentLat = userLocation?.lat || 55.75
      const currentLon = userLocation?.lon || 37.61

      let personalCatches: any[] = []
      let collectiveCatches: any[] = []
      let stats: any = {}

      if (mode === 'personal' || mode === 'collective') {
        const { data, error } = await supabase
          .from('catches')
          .select('fish_type, weight, bite_rating, lure_type, lure_color, catch_date, location_lat, location_lng, time_of_day, notes')
          .eq('user_id', user.id)
          .order('catch_date', { ascending: false })
          .limit(30)
        if (error) throw error
        personalCatches = data || []
        if (personalCatches.length < 3 && mode === 'personal') {
          alert('📊 Нужно минимум 3 улова для анализа!')
          setLoading(false)
          return
        }
      }

      if (mode === 'collective') {
        collectiveCatches = await getCatchesInRadius(currentLat, currentLon, radiusKm)
        if (collectiveCatches.length < 5) {
          alert(`📊 В радиусе ${radiusKm} км найдено только ${collectiveCatches.length} уловов. Нужно минимум 5.`)
          setLoading(false)
          return
        }
      }

      const analyzeCatchesWithWeather = async (catchList: any[]) => {
        return await Promise.all(
          catchList.map(async (c: any) => {
            if (c.location_lat && c.location_lng) {
              const histWeather = await getHistoricalWeather(c.location_lat, c.location_lng, c.catch_date)
              return { ...c, weather: histWeather }
            }
            return c
          })
        )
      }

      const personalWithWeather = await analyzeCatchesWithWeather(personalCatches)
      const collectiveWithWeather = await analyzeCatchesWithWeather(collectiveCatches)

      const analyzeNotes = (catchList: any[]) => {
        const notesWithContent = catchList.filter((c: any) => c.notes && c.notes.trim())
        const commonPatterns: any = {}
        notesWithContent.forEach((c: any) => {
          const notes = c.notes.toLowerCase()
          if (notes.includes('утро') || notes.includes('рано')) commonPatterns.morning = (commonPatterns.morning || 0) + 1
          if (notes.includes('вечер')) commonPatterns.evening = (commonPatterns.evening || 0) + 1
          if (notes.includes('яма') || notes.includes('глубина')) commonPatterns.depth = (commonPatterns.depth || 0) + 1
          if (notes.includes('камыш') || notes.includes('трава')) commonPatterns.vegetation = (commonPatterns.vegetation || 0) + 1
          if (notes.includes('течение')) commonPatterns.current = (commonPatterns.current || 0) + 1
          if (notes.includes('клевало') || notes.includes('брало')) commonPatterns.active = (commonPatterns.active || 0) + 1
          if (notes.includes('не клевало') || notes.includes('не брало')) commonPatterns.inactive = (commonPatterns.inactive || 0) + 1
        })
        return {
          totalNotes: notesWithContent.length,
          patterns: commonPatterns,
          sampleNotes: notesWithContent.slice(0, 3).map((c: any) => c.notes).join('; '),
        }
      }

      if (personalWithWeather.length > 0) {
        const successful = personalWithWeather.filter((c: any) => (c.bite_rating || 0) >= 7)
        const notesAnalysis = analyzeNotes(personalWithWeather)
        stats.personal = {
          total: personalWithWeather.length,
          successful: successful.length,
          avgTempGood: successful.length > 0 ? Math.round(successful.reduce((sum: number, c: any) => sum + (c.weather?.temp || 15), 0) / successful.length) : 15,
          avgPressureGood: successful.length > 0 ? Math.round(successful.reduce((sum: number, c: any) => sum + (c.weather?.pressure || 760), 0) / successful.length) : 760,
          topFish: Object.entries(successful.reduce((acc: any, c: any) => { acc[c.fish_type] = (acc[c.fish_type] || 0) + 1; return acc }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((x: any) => x[0]).join(', ') || 'Не определена',
          topLure: Object.entries(successful.reduce((acc: any, c: any) => { const key = `${c.lure_type || ''} ${c.lure_color || ''}`.trim(); if (key) acc[key] = (acc[key] || 0) + 1; return acc }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((x: any) => x[0]).join(', ') || 'Не определена',
          notes: notesAnalysis,
        }
      }

      if (collectiveWithWeather.length > 0) {
        const successful = collectiveWithWeather.filter((c: any) => (c.bite_rating || 0) >= 7)
        const uniqueFishers = new Set(collectiveWithWeather.map((c: any) => c.user_id)).size
        const notesAnalysis = analyzeNotes(collectiveWithWeather)
        stats.collective = {
          total: collectiveWithWeather.length,
          uniqueFishers: uniqueFishers,
          successful: successful.length,
          avgTempGood: successful.length > 0 ? Math.round(successful.reduce((sum: number, c: any) => sum + (c.weather?.temp || 15), 0) / successful.length) : 15,
          avgPressureGood: successful.length > 0 ? Math.round(successful.reduce((sum: number, c: any) => sum + (c.weather?.pressure || 760), 0) / successful.length) : 760,
          topFish: Object.entries(successful.reduce((acc: any, c: any) => { acc[c.fish_type] = (acc[c.fish_type] || 0) + 1; return acc }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((x: any) => x[0]).join(', ') || 'Не определена',
          topLure: Object.entries(successful.reduce((acc: any, c: any) => { const key = `${c.lure_type || ''} ${c.lure_color || ''}`.trim(); if (key) acc[key] = (acc[key] || 0) + 1; return acc }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((x: any) => x[0]).join(', ') || 'Не определена',
          notes: notesAnalysis,
        }
      }

      const currentWeatherText = weather 
        ? `СЕГОДНЯ (${weather.date}): ${weather.temp}°C, ${weather.description}, давление ${weather.pressure} мм рт. ст., влажность ${weather.humidity}%, ветер ${weather.wind} м/с`
        : 'СЕГОДНЯ: данные о погоде недоступны'

      const forecastText = forecast.length > 0
        ? forecast.map((day: any, _i: number) => 
            `📅 ${day.date} (${day.fullDate}): ${day.temp}°C (min ${day.tempMin}°, max ${day.tempMax}°), ${day.description}, давление ${day.pressure} мм рт. ст., влажность ${day.humidity}%, ветер ${day.wind} м/с`
          ).join('\n')
        : 'ПРОГНОЗ: данные недоступны'

      // 🔥 КРАТКИЕ ПРОМПТЫ (Без воды, только суть)
      let prompt = ''

      if (mode === 'weather') {
        prompt = `
ТЫ — ихтиолог. Дай КРАТКИЙ прогноз на основе погоды.

🌤️ ПОГОДА:
${currentWeatherText}
${forecastText}

📋 ОТВЕТ СТРОГО ПО ФОРМАТУ:
🎯 ШАНС УСПЕХА: [X/10]
📍 ГДЕ ЛОВИТЬ: [Тип места: ямы, берег, трава...]
🐟 КОГО ЛОВИТЬ: [Вид рыбы]
🎣 НА ЧТО: [Приманка]
⏰ КОГДА: [Время суток]
💡 СОВЕТ: [1 короткое предложение]

Никаких лишних слов. Только факты.
`
      } else if (mode === 'personal') {
        const notesText = stats.personal?.notes?.totalNotes > 0 ? `
📝 ЗАМЕТКИ: ${stats.personal.notes.sampleNotes}
` : ''

        prompt = `
ТЫ — ихтиолог. Проанализируй ЛИЧНЫЙ опыт и дай КРАТКИЙ план действий.

📊 СТАТИСТИКА:
• Успешных уловов: ${stats.personal?.successful || 0}/${stats.personal?.total || 0}
• Лучшая погода для тебя: ${stats.personal?.avgTempGood}°C, ${stats.personal?.avgPressureGood} мм рт. ст.
• Твои лучшие рыбы: ${stats.personal?.topFish}
• Твои лучшие приманки: ${stats.personal?.topLure}
${notesText}

🌤️ ТЕКУЩАЯ ПОГОДА:
${currentWeatherText}

📋 ОТВЕТ СТРОГО ПО ФОРМАТУ:
🎯 ШАНС УСПЕХА: [X/10] (на основе твоей статистики)
📍 ГДЕ ЛОВИТЬ: [Конкретное место, где ты ловил раньше]
🐟 КОГО ЛОВИТЬ: [Рыба из твоего топа]
🎣 НА ЧТО: [Приманка из твоего топа]
⏰ КОГДА: [Лучшее время по твоим данным]
💡 СОВЕТ: [Кратко: почему это сработает сегодня]

Никакой воды. Только конкретика.
`
      } else if (mode === 'collective') {
        const notesText = stats.collective?.notes?.totalNotes > 0 ? `
📝 МНЕНИЯ РЫБАКОВ: ${stats.collective.notes.sampleNotes}
` : ''

        prompt = `
ТЫ — ихтиолог-аналитик. Дай КРАТКИЙ прогноз на основе данных ВСЕХ рыбаков рядом.

📊 ДАННЫЕ РАДИУСА ${radiusKm} КМ:
• Уловов: ${stats.collective?.total || 0} от ${stats.collective?.uniqueFishers || 0} рыбаков
• Успешных: ${stats.collective?.successful || 0}
• Лучшая погода здесь: ${stats.collective?.avgTempGood}°C, ${stats.collective?.avgPressureGood} мм рт. ст.
• Здесь ловят: ${stats.collective?.topFish}
• Работают приманки: ${stats.collective?.topLure}
${notesText}

🌤️ ТЕКУЩАЯ ПОГОДА:
${currentWeatherText}

📋 ОТВЕТ СТРОГО ПО ФОРМАТУ:
🎯 ШАНС УСПЕХА: [X/10] (на основе коллективного опыта)
📍 ПЕРСПЕКТИВНЫЕ ТОЧКИ: [Описание мест: "у камышей", "на свале", "в заводи"]
🐟 АКТИВНАЯ РЫБА: [Кого сейчас ловят другие]
🎣 РАБОЧИЕ ПРИМАНКИ: [Что используют другие]
⏰ ЛУЧШЕЕ ВРЕМЯ: [Когда клюёт у других]
💡 СОВЕТ: [Краткая рекомендация]

Никакой воды. Только факты и цифры.
`
      }

      // ЗАПРОС К СЕРВЕРНОМУ API
      const response = await fetch('/api/ai-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const responseText = await response.text()
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON: ${responseText}`);
      }

      // 🔥 ПРОВЕРКА НА ЛИМИТ
      if (response.status === 429 || data.error === 'LIMIT_REACHED') {
        setPrediction(
          `📊 **Лимит на сегодня исчерпан!**\n\n` +
          `Приходи завтра — лимиты обновятся.`
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      setPrediction(data.prediction);
    } catch (error: any) {
      console.error('AI error:', error);
      setPrediction(`❌ Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-20">
      <h2 className="text-2xl font-bold text-center">🤖 ИИ-Прогноз</h2>

      {apiKeyMissing && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-800 font-semibold">⚠️ Погода недоступна</p>
          <p className="text-xs text-yellow-700 mt-1">Добавь VITE_OPENWEATHER_API_KEY в .env</p>
        </div>
      )}

      {/* Выбор режима */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setMode('weather')}
          className={`py-3 px-4 rounded-lg text-sm font-semibold transition ${
            mode === 'weather'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🌤️ По погоде (без анализа)
        </button>
        <button
          onClick={() => setMode('personal')}
          className={`py-3 px-4 rounded-lg text-sm font-semibold transition ${
            mode === 'personal'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          👤 Личный анализ (мой дневник)
        </button>
        <button
          onClick={() => setMode('collective')}
          className={`py-3 px-4 rounded-lg text-sm font-semibold transition ${
            mode === 'collective'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🔗 Коллективный (все рыбаки ±{radiusKm}км)
        </button>
      </div>

      {/* Выбор радиуса для коллективного анализа */}
      {mode === 'collective' && (
        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">📍 Радиус поиска:</label>
            <span className="text-lg font-bold text-blue-600">{radiusKm} км</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5 км</span>
            <span>100 км</span>
          </div>
        </div>
      )}

      {/* Текущая погода с кнопкой обновления */}
      {weather && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs opacity-90">📍 {weather.city}</p>
              <p className="text-xs opacity-75">{weather.date}</p>
            </div>
            <button
              onClick={fetchUserLocation}
              disabled={locating}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition disabled:opacity-50"
              title="Обновить местоположение"
            >
              {locating ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                '📍'
              )}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold">{Math.round(weather.temp)}°C</p>
              <p className="text-sm">{weather.description}</p>
            </div>
            <div className="text-right text-xs space-y-1">
              <p>💨 {weather.wind} м/с</p>
              <p>💧 {weather.humidity}%</p>
              <p>📊 {weather.pressure} мм рт. ст.</p>
            </div>
          </div>
        </div>
      )}

      {/* Прогноз на 3 дня */}
      {forecast.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">📅 Прогноз:</h3>
          <div className="space-y-2">
            {forecast.map((day: any, _idx: number) => (
              <div key={day.fullDate} className="bg-white p-3 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{day.date}</p>
                    <p className="text-xs text-gray-500 mt-1">{day.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(day.temp)}°</p>
                    <p className="text-xs text-gray-400">{day.tempMin}° / {day.tempMax}°</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>📊 {day.pressure} мм</span>
                  <span>💧 {day.humidity}%</span>
                  <span>💨 {day.wind} м/с</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка генерации */}
      <button
        onClick={generatePrediction}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 hover:shadow-xl transition active:scale-95"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Анализирую...
          </span>
        ) : (
          '✨ Получить прогноз'
        )}
      </button>

      {/* Результат */}
      {prediction && (
        <div className={`p-5 rounded-xl shadow-lg border animate-fade-in ${
          prediction.includes('Лимит на сегодня исчерпан')
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-white border-gray-200'
        }`}>
          <div className={`whitespace-pre-wrap font-sans text-sm leading-relaxed ${
             prediction.includes('Лимит на сегодня исчерпан')
               ? 'text-yellow-900 text-center font-semibold'
               : 'text-gray-800'
          }`}>
            {prediction}
          </div>
        </div>
      )}
    </div>
  )
}