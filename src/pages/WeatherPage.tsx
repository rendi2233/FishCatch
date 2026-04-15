import { useState, useEffect } from 'react'
import { hpaToMmHg } from '../utils/weather'

type WeatherData = {
  temp: number
  feels_like: number
  pressure: number
  wind_speed: number
  description: string
  icon: string
  city: string
}

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 🔥 Получаем ключ из .env (вместо хардкода!)
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

  useEffect(() => {
    if (!API_KEY) {
      setError('⚠️ VITE_OPENWEATHER_API_KEY не найден в .env')
      setLoading(false)
      return
    }
    fetchWeatherData()
  }, [API_KEY])

  const fetchWeatherData = async (lat?: number, lon?: number) => {
    let targetLat = 55.75
    let targetLon = 37.61

    if (lat && lon) {
      targetLat = lat
      targetLon = lon
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${targetLat}&lon=${targetLon}&appid=${API_KEY}&units=metric&lang=ru`
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Неверный API ключ')
        } else if (response.status === 404) {
          throw new Error('Город не найден')
        }
        throw new Error(`Ошибка API: ${response.status}`)
      }

      const data = await response.json()

      setWeather({
        temp: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        city: data.name,
      })
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить погоду')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherData(pos.coords.latitude, pos.coords.longitude)
        },
        () => {
          fetchWeatherData()
        }
      )
    }
  }, [])

  if (loading) return <div className="p-10 text-center text-xl animate-pulse">⏳ Загружаем погоду...</div>
  if (error) return (
    <div className="p-10 text-center text-red-600">
      {error}
      <br/>
      <small className="text-xs text-gray-500">
        Проверь .env файл и ключ VITE_OPENWEATHER_API_KEY
      </small>
    </div>
  )
  if (!weather) return null

  const pressureMmHg = hpaToMmHg(weather.pressure)

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white shadow-lg text-center">
        <h3 className="text-2xl font-bold mb-1">{weather.city}</h3>
        <p className="text-blue-100 mb-4 capitalize">{weather.description}</p>
        
        <div className="flex justify-center items-center gap-4 mb-6">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
            alt="icon" 
            className="w-20 h-20"
          />
          <div className="text-6xl font-bold">{weather.temp}°</div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-white/20 rounded-xl p-3 backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-xs text-blue-100">Ощущается</span>
            <span className="font-bold text-lg">{weather.feels_like}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-blue-100">Давление</span>
            <span className="font-bold text-lg">{pressureMmHg} <small className="text-xs">мм</small></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-blue-100">Ветер</span>
            <span className="font-bold text-lg">{weather.wind_speed} <small className="text-xs">м/с</small></span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-gray-500 text-sm">
        Давление {pressureMmHg} мм рт. ст. считается {pressureMmHg > 760 ? 'повышенным (щука может быть активнее)' : pressureMmHg < 740 ? 'пониженным (карась может лучше клевать)' : 'нормальным'}.
      </p>
    </div>
  )
}