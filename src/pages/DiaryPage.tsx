import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'

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
}

export default function DiaryPage() {
  const [catches, setCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // Получаем текущего пользователя
    const user = getCurrentUser()
    setCurrentUser(user)
    loadCatches()
  }, [])

  const loadCatches = async () => {
    try {
      const user = await getCurrentUser()
      
      if (!user) {
        // Если пользователь не вошёл, показываем пустой список
        setCatches([])
        setLoading(false)
        return
      }

      // Загружаем ТОЛЬКО свои уловы
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('user_id', user.id)  // 🔥 ФИЛЬТР ПО user_id
        .order('catch_date', { ascending: false })

      if (error) throw error
      setCatches(data || [])
    } catch (error: any) {
      console.error('Ошибка загрузки:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-center">⏳ Загружаем дневник...</div>

  if (!currentUser) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-lg mb-4">🔐 Войдите, чтобы увидеть свой дневник</p>
          <a 
            href="/login" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Войти
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-center">📖 Мой дневник</h2>
      
      {catches.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          Уловов пока нет.<br/>Переходи на вкладку "Добавить"!
        </div>
      ) : (
        catches.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{c.fish_type}</h3>
                <p className="text-xs text-gray-400">
                  {new Date(c.catch_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-blue-600">{c.weight} кг</span>
                <p className="text-xs text-gray-500">x{c.fish_count} шт.</p>
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-sm text-gray-600">
              <span>⭐ Клёв: {c.bite_rating || '-'}/10</span>
              <span>⏱️ Время: {c.duration_hours || '-'} ч.</span>
            </div>

            {c.notes && (
              <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                💬 {c.notes}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  )
}