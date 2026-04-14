import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import L from 'leaflet'

// Фикс иконок Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

// Парсер времени из базы
const parseTimeOfDay = (value: string[] | string | null | undefined): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',').filter(t => t)
  }
  return [value]
}

const getTimeLabel = (time: string) => {
  switch(time) {
    case 'night': return '🌙'
    case 'morning': return '🌅'
    case 'day': return '☀️'
    case 'evening': return '🌇'
    default: return ''
  }
}

type Catch = {
  id: number
  fish_type: string
  weight: number
  fish_count: number
  catch_date: string
  location_lat: number | null
  location_lng: number | null
  lure_type?: string | null
  lure_color?: string | null
  bite_rating?: number | null
  duration_hours?: number | null
  time_of_day?: string[] | string | null
}

export default function MapPage() {
  const [catches, setCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null)

  useEffect(() => {
    const savedLocation = localStorage.getItem('viewLocation')
    if (savedLocation) {
      try {
        const { lat, lng } = JSON.parse(savedLocation)
        setSelectedLocation([lat, lng])
        localStorage.removeItem('viewLocation')
      } catch (_e) {
        console.error('Ошибка чтения координат')
      }
    }
    loadCatches()
  }, [])

  const loadCatches = async () => {
    try {
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)
        .order('catch_date', { ascending: false })

      if (error) throw error
      setCatches(data || [])
    } catch (error: any) {
      console.error('Ошибка загрузки:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-center">⏳ Загружаем карту...</div>

  const defaultCenter: [number, number] = selectedLocation || [55.75, 37.61]
  const defaultZoom = selectedLocation ? 15 : 10

  return (
    <div className="h-[calc(100vh-140px)]">
      <MapContainer center={defaultCenter} zoom={defaultZoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {selectedLocation && (
          <Marker position={selectedLocation}>
            <Popup>
              <div className="font-semibold text-blue-700">📍 Выбранная точка</div>
            </Popup>
          </Marker>
        )}

        {catches.map((c) => {
          if (c.location_lat == null || c.location_lng == null) return null
          
          const times = parseTimeOfDay(c.time_of_day)
          
          return (
            <Marker key={c.id} position={[c.location_lat, c.location_lng]}>
              <Popup maxWidth={280}>
                <div style={{ fontFamily: 'sans-serif', lineHeight: '1.4', fontSize: '13px' }}>
                  {/* Заголовок: Рыба + Вес */}
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 6 }}>
                    <strong style={{ fontSize: 16, color: '#1e40af' }}>🐟 {c.fish_type}</strong>
                    <span style={{ marginLeft: 8, fontWeight: 'bold', color: '#0f172a' }}>
                      {c.weight} кг {c.fish_count > 1 ? `(${c.fish_count} шт.)` : ''}
                    </span>
                  </div>
                  
                  {/* Детали */}
                  <div style={{ color: '#475569', display: 'grid', gap: 4 }}>
                    <div>📅 {new Date(c.catch_date).toLocaleDateString('ru-RU')}</div>
                    
                    {times.length > 0 && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        🕐 {times.map((t, i) => <span key={i}>{getTimeLabel(t)}</span>)}
                      </div>
                    )}
                    
                    {c.lure_type && (
                      <div>🎣 {c.lure_type}{c.lure_color ? ` (${c.lure_color})` : ''}</div>
                    )}
                    
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                      {c.bite_rating != null && <span>⭐ Клёв: {c.bite_rating}/10</span>}
                      {c.duration_hours != null && <span>⏱️ {c.duration_hours} ч.</span>}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}