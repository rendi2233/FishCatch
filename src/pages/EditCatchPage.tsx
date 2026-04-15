import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useNavigate, useParams } from 'react-router-dom'

export default function EditCatchPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const [fishType, setFishType] = useState('')
  const [weight, setWeight] = useState('')
  const [fishCount, setFishCount] = useState('1')
  const [biteRating, setBiteRating] = useState('')
  const [lureType, setLureType] = useState('')
  const [lureColor, setLureColor] = useState('')
  const [notes, setNotes] = useState('')
  const [catchDate, setCatchDate] = useState('')
  const [timeOfDay, setTimeOfDay] = useState<string[]>([])

  useEffect(() => {
    loadCatch()
  }, [id])

  const loadCatch = async () => {
    const user = await getCurrentUser()
    if (!user) {
      alert('🔐 Пожалуйста, войдите!')
      navigate('/login')
      return
    }

    const { data, error } = await supabase
      .from('catches')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      alert('❌ Запись не найдена!')
      navigate('/diary')
      return
    }

    setFishType(data.fish_type)
    setWeight(data.weight.toString())
    setFishCount(data.fish_count.toString())
    setBiteRating(data.bite_rating?.toString() || '')
    setLureType(data.lure_type || '')
    setLureColor(data.lure_color || '')
    setNotes(data.notes || '')
    setCatchDate(data.catch_date.split('T')[0])
    
    if (data.time_of_day) {
      const times = data.time_of_day.replace(/[{}]/g, '').split(',').filter((t: string) => t)
      setTimeOfDay(times)
    }
  }

  // 🔥 ИСПРАВЛЕНО: Добавлена типизация
  const toggleTimeOfDay = (t: string) => {
    setTimeOfDay(prev => 
      prev.includes(t) ? prev.filter(time => time !== t) : [...prev, t]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const user = await getCurrentUser()
    if (!user) {
      alert('🔐 Пожалуйста, войдите!')
      navigate('/login')
      return
    }

    const timeOfDayValue = timeOfDay.length > 0 ? `{${timeOfDay.join(',')}}` : null

    const { error } = await supabase
      .from('catches')
      .update({
        fish_type: fishType,
        weight: parseFloat(weight) || 0,
        fish_count: parseInt(fishCount) || 1,
        bite_rating: parseInt(biteRating) || null,
        lure_type: lureType || null,
        lure_color: lureColor || null,
        notes: notes || null,
        catch_date: new Date(catchDate).toISOString(),
        time_of_day: timeOfDayValue,
        // 🔥 УДАЛЕНО: updated_at (нет такой колонки)
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      alert('❌ Ошибка при сохранении: ' + error.message)
    } else {
      alert('✅ Запись обновлена!')
      navigate('/diary')
    }

    setLoading(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <h2 className="text-2xl font-bold mb-4 text-center">✏️ Редактировать улов</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Тип рыбы</label>
          <input
            type="text"
            value={fishType}
            onChange={(e) => setFishType(e.target.value)}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Вес (кг)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Количество</label>
            <input
              type="number"
              min="1"
              value={fishCount}
              onChange={(e) => setFishCount(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Оценка клёва: <span className="text-blue-600 font-bold">{biteRating || '-'}</span>/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={biteRating}
            onChange={(e) => setBiteRating(e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Дата</label>
          <input
            type="date"
            value={catchDate}
            onChange={(e) => setCatchDate(e.target.value)}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Время суток</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'night', label: '🌙 Ночь', value: 'night' },
              { id: 'morning', label: '🌅 Утро', value: 'morning' },
              { id: 'day', label: '☀️ День', value: 'day' },
              { id: 'evening', label: '🌇 Вечер', value: 'evening' },
            ].map((time) => (
              <label
                key={time.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                  timeOfDay.includes(time.value) ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={timeOfDay.includes(time.value)}
                  onChange={() => toggleTimeOfDay(time.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{time.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Тип приманки</label>
            <select
              value={lureType}
              onChange={(e) => setLureType(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
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
            <label className="block text-sm font-medium mb-1">Цвет/насадка</label>
            <input
              type="text"
              value={lureColor}
              onChange={(e) => setLureColor(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Например: красный"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Заметки</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-lg"
            rows={3}
            placeholder="Где поймал, на что клевало..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/diary')}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
          >
            {loading ? 'Сохраняем...' : '💾 Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}