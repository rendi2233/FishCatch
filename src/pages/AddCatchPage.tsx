import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AddCatchPage() {
  const [fishType, setFishType] = useState('')
  const [fishCount, setFishCount] = useState('1')
  const [weight, setWeight] = useState('')
  const [biteRating, setBiteRating] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Состояния для координат
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const [geoError, setGeoError] = useState('')

  // Слушаем возврат с карты выбора места
  useEffect(() => {
    const savedLoc = localStorage.getItem('selectedLocation')
    if (savedLoc) {
      try {
        const { lat, lng } = JSON.parse(savedLoc)
        setLatitude(lat.toFixed(6))
        setLongitude(lng.toFixed(6))
        localStorage.removeItem('selectedLocation') // Очищаем память
      } catch (e) {
        console.error("Ошибка чтения координат", e)
      }
    }
  }, [])

  // Функция для кнопки GPS (если всё же нужно определить автоматически)
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
      (error) => {
        setGeoError('Не удалось определить местоположение.')
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!latitude || !longitude) {
      alert('Укажите координаты (через карту или GPS)!')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('catches')
      .insert([
        {
          fish_type: fishType,
          fish_count: parseInt(fishCount) || 1,
          weight: parseFloat(weight) || 0,
          bite_rating: parseInt(biteRating) || null,
          duration_hours: parseFloat(duration) || null,
          notes: notes,
          catch_date: new Date().toISOString(),
          location_lat: parseFloat(latitude),
          location_lng: parseFloat(longitude),
        }
      ])

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      alert('Улов добавлен! 🎉')
      // Сброс формы
      setFishType('')
      setFishCount('1')
      setWeight('')
      setBiteRating('')
      setDuration('')
      setNotes('')
      setLatitude('')
      setLongitude('')
    }

    setLoading(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Добавить улов</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Блок координат */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
          <label className="block text-sm font-semibold text-blue-800">📍 Место ловли</label>
          
          {/* Кнопка перехода на карту */}
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
              readOnly // Только для чтения, чтобы случайно не стереть
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

        {/* Остальные поля формы */}
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