import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, getCurrentUser } from '../lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Если уже вошёл — перенаправляем на главную
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (user) {
        navigate('/')
      }
    }
    checkAuth()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      // ВХОД
      const { data, error } = await signIn(email, password)
      if (error) {
        setError('Ошибка входа: ' + error.message)
      } else {
        navigate('/')
      }
    } else {
      // РЕГИСТРАЦИЯ
      const { data, error } = await signUp(email, password)
      if (error) {
        setError('Ошибка регистрации: ' + error.message)
      } else {
        alert('✅ Регистрация успешна! Теперь войдите.')
        setIsLogin(true)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-6">
          {isLogin ? '🎣 Вход' : '📝 Регистрация'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
          >
            {loading ? '⏳ Подождите...' : isLogin ? '🔐 Войти' : '✅ Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="text-blue-600 hover:underline text-sm"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}