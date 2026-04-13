import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

export default function AddCatchPage() {
  const [fishType, setFishType] = useState('')
  const [fishCount, setFishCount] = useState('1')
  const [weight, setWeight] = useState('')
  const [biteRating, setBiteRating] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const [geoError, setGeoError] = useState('')

  // 🔥 НОВОЕ: Дата рыбалки (по умолчанию сегодня)
  const [catchDate, setCatchDate] = useState(new Date().toISOString().split('T')[0])

  // 🔥 НОВОЕ: Время суток (чекбоксы)
  const [timeOfDay, setTimeOfDay] = useState<string[]>([])

  const navigate = useNavigate()

  // 🔥 ПРОВЕРКА АВТОРИЗАЦИИ
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        alert('🔐 Пожалуйста, войдите, чтобы добавить улов!')
        navigate('/login')
      }
    }
    checkAuth()
  }, [navigate])

  useEffect(() => {
    const savedLoc = localStorage.getItem('selectedLocation')
    if (savedLoc) {
      try {
        const { lat, lng } = JSON.parse(savedLoc)
        setLatitude(lat.toFixed(6))
        setLongitude(lng.toFixed(6))
        localStorage.removeItem('selectedLocation')
      } catch (_e) {
        console.error("Ошибка чтения координат")
      }
    }
  }, [])

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGeoError('Браузер не поддерживает геолокацию')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
      },
      (_error) => {
        setGeoError('Не удалось определить местоположение.')
      }
    )
  }

  // 🔥 НОВОЕ: Обработка чекбоксов времени суток
  const toggleTimeOfDay = (time: string) => {
    setTimeOfDay(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 🔥 ПРОВЕРКА АВТОРИЗАЦИИ
    const user = await getCurrentUser()
    if (!user) {
      alert('🔐 Пожалуйста, войдите, чтобы добавить улов!')
      navigate('/login')
      return
    }

    if (!latitude || !longitude) {
      alert('Укажите координаты (через карту или GPS)!')
      return
    }

    setLoading(true)

    // 🔥 НОВОЕ: Формируем дату с временем (полдень по умолчанию)
    const fullDate = new Date(catchDate)
    fullDate.setHours(12, 0, 0, 0)

    const { error: supabaseError } = await supabase
      .from('catches')
      .insert([
        {
          fish_type: fishType,
          fish_count: parseInt(fishCount) || 1,
          weight: parseFloat(weight) || 0,
          bite_rating: parseInt(biteRating) || null,
          duration_hours: parseFloat(duration) || null,
          notes: notes,
          catch_date: fullDate.toISOString(),
          location_lat: parseFloat(latitude),
          location_lng: parseFloat(longitude),
          user_id: user.id,
          time_of_day: timeOfDay.length > 0 ? timeOfDay : null,
        }
      ])

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      alert('Ошибка: ' + supabaseError.message)
    } else {
      alert('Улов добавлен! 🎉')
      setFishType('')
      setFishCount('1')
      setWeight('')
      setBiteRating('')
      setDuration('')
      setNotes('')
      setLatitude('')
      setLongitude('')
      setCatchDate(new Date().toISOString().split('T')[0])
      setTimeOfDay([])
      navigate('/diary')
    }

    setLoading(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Добавить улов</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 🔥 НОВОЕ: Выбор даты */}
        <div>
          <label className="block text-sm font-medium mb-1">📅 Дата рыбалки</label>
          <input
            type="date"
            value={catchDate}
            onChange={(e) => setCatchDate(e.target.value)}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        {/* 🔥 НОВОЕ: Время суток (чекбоксы) */}
        <div>
          <label className="block text-sm font-medium mb-2">🕐 Время суток</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'night', label: '🌙 Ночь', value: 'night' },
              { id: 'morning', label: '🌅 Утро', value: 'morning' },
              { id: 'day', label: '☀️ День', value: 'day' },
              { id: 'evening', label: '🌇 Вечер', value: 'evening' },
            ].map((time) => (
              <label
                key={time.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition
                  ${timeOfDay.includes(time.value) 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-white border-gray-200'}`}
              >
                <input
                  type="checkbox"
                  checked={timeOfDay.includes(time.value)}
                  onChange={() => toggleTimeOfDay(time.value)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">{time.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Можно выбрать несколько вариантов</p>
        </div>

        {/* Блок координат */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
          <label className="block text-sm font-semibold text-blue-800">📍 Место ловли</label>
          
          <button
            type="button"
            onClick={() => window.location.href = '/select-location'}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            🗺️ Выбрать на карте
          </button>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
            <span>или</span>
            <button type="button" onClick={handleGetGPS} className="text-blue-600 underline">
              определить GPS автоматически
            </button>
          </div>

          {geoError && <p className="text-xs text-red-600 text-center">{geoError}</p>}

          <div className="grid grid-cols-2 gap-2 mt-2">
            <input
              type="number"
              step="any"
              placeholder="Широта (Lat)"
              value={latitude}
              readOnly
              className="w-full p-2 border rounded text-sm bg-white text-gray-600"
            />
            <input
              type="number"
              step="any"
              placeholder="Долгота (Lng)"
              value={longitude}
              readOnly
              className="w-full p-2 border rounded text-sm bg-white text-gray-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Тип рыбы</label>
          <input type="text" value={fishType} onChange={(e) => setFishType(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Например: Щука, Окунь..." required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Количество (шт)</label>
            <input type="number" min="1" value={fishCount} onChange={(e) => setFishCount(e.target.value)} className="w-full p-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Вес (кг)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Общий вес" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Оценка клёва (1-10): <span className="text-blue-600 font-bold">{biteRating || '-'}</span>
          </label>
          <input type="range" min="1" max="10" step="1" value={biteRating} onChange={(e) => setBiteRating(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1</span><span>5</span><span>10</span></div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Время рыбалки (часов)</label>
          <input type="number" step="0.5" min="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="2.5" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Заметки</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2 border rounded-lg" rows={3} placeholder="Где поймал, на что клевало..." />
        </div>

        <button
          type="submit"
          disabled={loading || !latitude}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Сохраняем...' : '💾 Сохранить улов'}
        </button>
      </form>
    </div>
  )
}