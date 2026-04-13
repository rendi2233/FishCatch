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

type Catch = {
  id: number
  fish_type: string
  weight: number
  catch_date: string
  location_lat: number | null
  location_lng: number | null
}

export default function MapPage() {
  const [catches, setCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null)

  useEffect(() => {
    // 🔥 Проверяем, есть ли координаты для отображения (из дневника)
    const savedLocation = localStorage.getItem('viewLocation')
    if (savedLocation) {
      try {
        const { lat, lng } = JSON.parse(savedLocation)
        setSelectedLocation([lat, lng])
        // Очищаем после использования
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

      if (error) throw error
      setCatches(data || [])
    } catch (error: any) {
      console.error('Ошибка загрузки:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-center">⏳ Загружаем карту...</div>

  // 🔥 Показываем выбранную точку или центр карты
  const defaultCenter: [number, number] = selectedLocation || [55.75, 37.61]
  const defaultZoom = selectedLocation ? 15 : 10

  return (
    <div className="h-[calc(100vh-140px)]">
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 🔥 Маркер выбранной точки из дневника */}
        {selectedLocation && (
          <Marker position={selectedLocation}>
            <Popup>
              <strong>📍 Место улова</strong><br/>
              Выбрано из дневника
            </Popup>
          </Marker>
        )}

        {/* 🔥 Все уловы */}
        {catches.map((c) => {
          // 🔥 Пропускаем уловы без координат (защита от null/undefined)
          if (c.location_lat == null || c.location_lng == null) {
            return null
          }
          
          return (
            <Marker 
              key={c.id} 
              position={[c.location_lat, c.location_lng]}
            >
              <Popup>
                <strong>{c.fish_type}</strong><br/>
                📅 {new Date(c.catch_date).toLocaleDateString('ru-RU')}<br/>
                ⚖️ {c.weight} кг
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}