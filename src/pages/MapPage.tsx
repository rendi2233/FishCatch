import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Исправляем иконки маркеров (стандартный фикс для React)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

type Catch = {
  id: string
  fish_type: string
  weight: number
  catch_date: string
  location_lat: number
  location_lng: number
}

export default function MapPage() {
  const [catches, setCatches] = useState<Catch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCatches()
  }, [])

  const loadCatches = async () => {
    // Берем только те записи, у которых есть координаты
    const { data, error } = await supabase
      .from('catches')
      .select('id, fish_type, weight, catch_date, location_lat, location_lng')
      .not('location_lat', 'is', null) 
      .order('catch_date', { ascending: false })

    if (error) console.error('Ошибка загрузки карты:', error)
    else setCatches(data || [])

    setLoading(false)
  }

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer center={[55.75, 37.61]} zoom={10} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Рисуем маркеры */}
        {catches.map((c) => (
          <Marker key={c.id} position={[c.location_lat, c.location_lng]}>
            <Popup>
              <div className="text-center">
                <strong className="text-lg block">{c.fish_type}</strong>
                <span>Вес: {c.weight} кг</span><br/>
                <small className="text-gray-500">
                  {new Date(c.catch_date).toLocaleDateString()}
                </small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Индикатор загрузки поверх карты */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-[1000] text-blue-600 font-bold">
          ⏳ Загружаем точки...
        </div>
      )}
    </div>
  )
}