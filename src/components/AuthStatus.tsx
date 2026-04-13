import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, getCurrentUser, onAuthStateChange } from '../lib/auth'

export default function AuthStatus() {
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Проверяем текущего пользователя при загрузке
    const initAuth = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    initAuth()

    // Слушим изменения авторизации
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
      >
        🔐 Войти
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 hidden sm:inline">
        👤 {user.email}
      </span>
      <button
        onClick={handleSignOut}
        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
      >
        🚪 Выйти
      </button>
    </div>
  )
}