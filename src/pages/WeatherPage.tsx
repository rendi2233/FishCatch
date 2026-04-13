import { useState, useEffect } from 'react'

type WeatherData = {
  temp: number
  feels_like: number
  pressure: number // в hPa
  wind_speed: number
  description: string
  icon: string
  city: string
}

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWeatherData()
  }, [])

  const fetchWeatherData = async (lat?: number, lon?: number) => {
    // ЗАМЕНИ ЭТУ СТРОКУ НА СВОЙ КЛЮЧ ОТ OPENWEATHERMAP
    const API_KEY = '058655024e60c3f947d9e93ef69fe4c3'; 
    
    // Координаты по умолчанию (Москва), если геолокация недоступна
    let targetLat = 55.75;
    let targetLon = 37.61;

    if (lat && lon) {
      targetLat = lat;
      targetLon = lon;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${targetLat}&lon=${targetLon}&appid=${API_KEY}&units=metric&lang=ru`
      );

      if (!response.ok) throw new Error('Ошибка API (проверь ключ или подожди активации)');

      const data = await response.json();

      setWeather({
        temp: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        city: data.name,
      });
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить погоду');
    } finally {
      setLoading(false);
    }
  }

  // Запрашиваем геопозицию при загрузке
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherData(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Если отказали в доступе, грузим погоду для Москвы (или дефолтных координат)
          fetchWeatherData();
        }
      );
    }
  }, []);

  if (loading) return <div className="p-10 text-center text-xl animate-pulse">⏳ Загружаем погоду...</div>
  if (error) return <div className="p-10 text-center text-red-600">⚠️ {error}<br/><small>Проверь API ключ в коде</small></div>
  if (!weather) return null;

  // Перевод давления из hPa в мм рт. ст. (1 hPa ≈ 0.75 мм рт. ст.)
  const pressureMmHg = Math.round(weather.pressure * 0.750062);

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Карточка погоды */}
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