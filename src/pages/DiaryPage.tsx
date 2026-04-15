import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

type Catch = {
  id: number
  fish_type: string
  weight: number
  fish_count: number
  bite_rating: number | null
  duration_hours: number | null
  notes: string | null
  catch_date: string
  user_id: string
  time_of_day?: string[] | string | null
  location_lat?: number | null
  location_lng?: number | null
  lure_type?: string | null
  lure_color?: string | null
}

const getTimeLabel = (time: string) => {
  switch(time) {
    case 'night': return 'Ночь'
    case 'morning': return 'Утро'
    case 'day': return 'День'
    case 'evening': return 'Вечер'
    default: return time
  }
}

// 🔥 Парсинг PostgreSQL array literal: {morning,evening} → ['morning', 'evening']
const parseTimeOfDay = (value: string[] | string | null | undefined): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',').filter(t => t)
  }
  return [value]
}

export default function DiaryPage() {
  const [catches, setCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      setCurrentUser(user)
    }
    checkAuth()
    loadCatches()
  }, [])

  const loadCatches = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setCatches([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('user_id', user.id)
        .order('catch_date', { ascending: false })

      if (error) throw error
      setCatches(data || [])
    } catch (error: any) {
      console.error('Ошибка загрузки:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, fishType: string) => {
    const confirmed = confirm(`🗑️ Удалить запись "${fishType}"?`)
    if (!confirmed) return

    try {
      const { error } = await supabase.from('catches').delete().eq('id', id)
      if (error) alert('Ошибка: ' + error.message)
      else {
        setCatches(prev => prev.filter(c => c.id !== id))
      }
    } catch (error: any) {
      alert('Ошибка: ' + error.message)
    }
  }

  const handleViewOnMap = (lat: number | null | undefined, lng: number | null | undefined) => {
    if (lat == null || lng == null) {
      alert('📍 Координаты не указаны для этого улова')
      return
    }
    localStorage.setItem('viewLocation', JSON.stringify({ lat, lng }))
    navigate('/map')
  }

  if (loading) return <div className="p-4 text-center">⏳ Загружаем дневник...</div>

  if (!currentUser) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-lg mb-4">🔐 Войдите, чтобы увидеть свой дневник</p>
          <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">
            Войти
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-20">
      <h2 className="text-2xl font-bold text-center">📖 Мой дневник</h2>
      
      {catches.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          Уловов пока нет.<br/>Переходи на вкладку "Добавить"!
        </div>
      ) : (
        catches.map((c) => {
          const times = parseTimeOfDay(c.time_of_day)
          
          return (
            <div 
              key={c.id} 
              className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500 hover:shadow-lg transition cursor-pointer"
              onClick={() => handleViewOnMap(c.location_lat, c.location_lng)}
            >
              {/* Заголовок */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{c.fish_type}</h3>
                  <p className="text-xs text-gray-400">📅 {new Date(c.catch_date).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">{c.weight} кг</span>
                  <p className="text-xs text-gray-500">x{c.fish_count} шт.</p>
                </div>
              </div>

              {/* Статистика + Время суток */}
              <div className="bg-gray-50 p-2 rounded-lg flex flex-wrap gap-y-1 gap-x-3 text-sm text-gray-600 mb-2">
                <span>⭐ {c.bite_rating || '-'}/10</span>
                <span className="text-gray-300">|</span>
                <span>⏱️ {c.duration_hours || '-'} ч.</span>
                
                {times.length > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="flex flex-wrap gap-1">
                      {times.map((time: string, idx: number) => (
                        <span 
                          key={`${c.id}-time-${idx}`} 
                          className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded"
                        >
                          {getTimeLabel(time)}
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </div>

              {/* Приманка */}
              {c.lure_type && (
                <div className="mb-2 text-xs font-medium text-blue-800 bg-blue-50 inline-block px-2 py-1 rounded border border-blue-100">
                  🎣 {c.lure_type} 
                  {c.lure_color && <span className="text-gray-600 ml-1">({c.lure_color})</span>}
                </div>
              )}

              {/* Заметки */}
              {c.notes && (
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic">
                  💬 {c.notes}
                </p>
              )}

              {/* 🔥 Кнопки */}
              <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); handleViewOnMap(c.location_lat, c.location_lng); }}
                  className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-100"
                >
                  🗺️ На карте
                </button>
                
                {/* ✏️ НОВАЯ КНОПКА: Редактировать */}
                <button
                  onClick={(e) => { 
                    e.stopPropagation()
                    navigate(`/edit-catch/${c.id}`)
                  }}
                  className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-100"
                >
                  ✏️ Ред.
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.fish_type); }}
                  className="flex-1 bg-red-50 text-red-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100"
                >
                  🗑️ Удалить
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}