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

  const [catchDate, setCatchDate] = useState(new Date().toISOString().split('T')[0])
  const [timeOfDay, setTimeOfDay] = useState<string[]>([])
  
  const [lureType, setLureType] = useState('')
  const [lureColor, setLureColor] = useState('')

  const navigate = useNavigate()

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

  const toggleTimeOfDay = (time: string) => {
    setTimeOfDay(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time]
    )
  }

  const resetLocation = () => {
    setLatitude('')
    setLongitude('')
    setGeoError('')
  }

  const handleLureTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLureType(e.target.value)
    setLureColor('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

    const fullDate = new Date(catchDate)
    fullDate.setHours(12, 0, 0, 0)

    // 🔥 Конвертируем массив в формат PostgreSQL: {morning,evening}
    const timeOfDayValue = timeOfDay.length > 0 
      ? `{${timeOfDay.join(',')}}` 
      : null

    console.log('📤 Отправляем:', { timeOfDay, timeOfDayValue })

    const { error: supabaseError } = await supabase
      .from('catches')
      .insert([
        {
          fish_type: fishType,
          fish_count: parseInt(fishCount) || 1,
          weight: parseFloat(weight) || 0,
          bite_rating: parseInt(biteRating) || null,
          duration_hours: parseFloat(duration) || null,
          notes: notes || null,
          catch_date: fullDate.toISOString(),
          location_lat: parseFloat(latitude),
          location_lng: parseFloat(longitude),
          user_id: user.id,
          time_of_day: timeOfDayValue,
          lure_type: lureType || null,
          lure_color: lureColor || null,
        }
      ])

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      alert('Ошибка: ' + supabaseError.message)
    } else {
      console.log('✅ Успешно сохранено!')
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
      setLureType('')
      setLureColor('')
      navigate('/diary')
    }

    setLoading(false)
  }

  const requiredInputClass = "w-full p-2 border rounded-lg border-l-4 border-l-transparent focus:border-l-blue-500 focus:outline-none required:border-l-red-400"
  const labelClass = "block text-sm font-medium mb-1"
  const isFloat = lureType === 'Поплавок'

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <h2 className="text-2xl font-bold mb-4 text-center">Добавить улов</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Дата */}
        <div>
          <label className={labelClass}>📅 Дата рыбалки <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={catchDate}
            onChange={(e) => setCatchDate(e.target.value)}
            className={requiredInputClass}
            required
          />
        </div>

        {/* Время суток */}
        <div>
          <label className={labelClass}>🕐 Время суток</label>
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
                  ${timeOfDay.includes(time.value) ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
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
        </div>

        {/* Блок координат */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <label className="block text-sm font-semibold text-blue-800 mb-2">📍 Место ловли <span className="text-red-500">*</span></label>
          
          {latitude && longitude ? (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                ✅ Выбрано: {latitude}, {longitude}
              </div>
              <button
                type="button"
                onClick={resetLocation}
                className="w-full bg-gray-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                🔄 Выбрать заново
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => window.location.href = '/select-location'}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                🗺️ Выбрать на карте
              </button>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                <span>или</span>
                <button type="button" onClick={handleGetGPS} className="text-blue-600 underline">
                  определить GPS
                </button>
              </div>

              {geoError && <p className="text-xs text-red-600 text-center">{geoError}</p>}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Широта"
                  value={latitude}
                  readOnly
                  className="w-full p-2 border rounded text-sm bg-white text-gray-600"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Долгота"
                  value={longitude}
                  readOnly
                  className="w-full p-2 border rounded text-sm bg-white text-gray-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Тип рыбы */}
        <div>
          <label className={labelClass}>Тип рыбы <span className="text-red-500">*</span></label>
          <input type="text" value={fishType} onChange={(e) => setFishType(e.target.value)} className={requiredInputClass} placeholder="Например: Щука, Окунь..." required />
        </div>

        {/* Вес и количество */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Количество (шт) <span className="text-red-500">*</span></label>
            <input type="number" min="1" value={fishCount} onChange={(e) => setFishCount(e.target.value)} className={requiredInputClass} required />
          </div>
          <div>
            <label className={labelClass}>Вес (кг) <span className="text-red-500">*</span></label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={requiredInputClass} placeholder="Общий вес" required />
          </div>
        </div>

        {/* Клёв */}
        <div>
          <label className={labelClass}>
            Оценка клёва (1-10): <span className="text-blue-600 font-bold">{biteRating || '-'}</span>
          </label>
          <input type="range" min="1" max="10" step="1" value={biteRating} onChange={(e) => setBiteRating(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1</span><span>5</span><span>10</span></div>
        </div>

        {/* Время рыбалки */}
        <div>
          <label className={labelClass}>Время рыбалки (часов)</label>
          <input type="number" step="0.5" min="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} className={requiredInputClass} placeholder="2.5" />
        </div>

        {/* Приманки */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🎣 Детали приманки (необязательно)</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Тип приманки</label>
              <select value={lureType} onChange={handleLureTypeChange} className={requiredInputClass}>
                <option value="">Не указано</option>
                <option value="Воблер">Воблер</option>
                <option value="Резина">Резина</option>
                <option value="Блесна">Блесна</option>
                <option value="Вертушка">Вертушка</option>
                <option value="Поплавок">Поплавок</option>
                <option value="Живец">Живец</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                {isFloat ? '🪱 Насадка' : '🎨 Цвет'}
              </label>
              <select value={lureColor} onChange={(e) => setLureColor(e.target.value)} className={requiredInputClass}>
                <option value="">Не указано</option>
                
                {isFloat ? (
                  <>
                    <option value="Хлеб">Хлеб</option>
                    <option value="Опарыш">Опарыш</option>
                    <option value="Червь">Червь</option>
                    <option value="Искусственные насадки">Искусственные насадки</option>
                  </>
                ) : (
                  <>
                    <option value="Натуральный">Натуральный</option>
                    <option value="Кислотный">Кислотный</option>
                    <option value="Яркий">Яркий (Огонь/Тигр)</option>
                    <option value="Серебро">Серебро</option>
                    <option value="Золото">Золото</option>
                    <option value="Тёмный">Тёмный</option>
                    <option value="Другое">Другое</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Заметки */}
        <div>
          <label className={labelClass}>Заметки</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={requiredInputClass} rows={3} placeholder="Где поймал, на что клевало..." />
        </div>

        <button
          type="submit"
          disabled={loading || !latitude}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed sticky bottom-4 shadow-lg"
        >
          {loading ? 'Сохраняем...' : '💾 Сохранить улов'}
        </button>
      </form>
    </div>
  )
}