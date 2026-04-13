import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MapPage from './pages/MapPage'
import DiaryPage from './pages/DiaryPage'
import WeatherPage from './pages/WeatherPage'
import AIPage from './pages/AIPage'
import AddCatchPage from './pages/AddCatchPage'
import LocationPicker from './pages/LocationPicker'

function NavButton({ to, icon, label }: { to: string; icon: string; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <Link to={to} className={`flex flex-col items-center text-xs ${isActive ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
      <span className="text-xl mb-1">{icon}</span>
      {label}
    </Link>
  )
}

function App() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow text-center font-bold text-lg">🎣 FishCatch PWA</header>
      
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/add-catch" element={<AddCatchPage />} />
          <Route path="/select-location" element={<LocationPicker />} />
        </Routes>
      </main>

      <nav className="bg-white border-t p-2 flex justify-around">
        <NavButton to="/add-catch" icon="➕" label="Добавить" />
        <NavButton to="/map" icon="🗺️" label="Карта" />
        <NavButton to="/diary" icon="📖" label="Дневник" />
        <NavButton to="/weather" icon="☀️" label="Погода" />
        <NavButton to="/ai" icon="🤖" label="ИИ" />
      </nav>
    </div>
  )
}

export default App