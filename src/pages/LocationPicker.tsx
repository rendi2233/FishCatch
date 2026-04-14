import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'

// Фикс иконок Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

function GeolocateButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap()
  const [locating, setLocating] = useState(false)

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается браузером')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        onLocate(latitude, longitude)
        map.flyTo([latitude, longitude], 15, { duration: 1.5 })
        setLocating(false)
      },
      (_err) => {
        alert('Не удалось определить местоположение.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <button
      onClick={handleLocate}
      disabled={locating}
      // 🔥 Кнопка перенесена в правый верхний угол карты
      className="fixed top-20 right-4 z-[1000] bg-white text-blue-600 p-3 rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-50 font-bold text-xl"
      title="Моё местоположение"
    >
      {locating ? '📡' : '📍'}
    </button>
  )
}

function LocationMarker({ setLatLng }: { setLatLng: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null)

  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      setLatLng(e.latlng.lat, e.latlng.lng)
    },
    locationfound(e) {
      setPosition(e.latlng)
      setLatLng(e.latlng.lat, e.latlng.lng)
    }
  })

  return position === null ? null : <Marker position={position}></Marker>
}

export default function LocationPicker() {
  const navigate = useNavigate()
  const [lat, setLat] = useState<number>(55.75)
  const [lng, setLng] = useState<number>(37.61)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
      }, () => {})
    }
  }, [])

  const handleConfirm = () => {
    localStorage.setItem('selectedLocation', JSON.stringify({ lat, lng }))
    navigate(-1)
  }

  return (
    // 🔥 Root: h-screen + overflow-hidden (запрещаем скролл страницы)
    <div className="fixed inset-0 flex flex-col bg-gray-100 overflow-hidden">
      
      {/* 🔥 ШАПКА: Fixed, не скроллится */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow flex justify-between items-center z-[1000] px-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 font-bold px-2 text-sm">✕ Отмена</button>
        <span className="font-semibold text-gray-800 text-sm">Ткни в место ловли</span>
        <button 
          onClick={handleConfirm} 
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-blue-700"
        >
          ✅ Готово
        </button>
      </header>

      {/* 🔥 КАРТА: Занимает всё пространство, с отступами под шапку и подвал */}
      <div className="flex-1 pt-16 pb-12">
        <MapContainer 
          center={[lat, lng]} 
          zoom={13} 
          className="w-full h-full" 
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker setLatLng={(l, g) => { setLat(l); setLng(g); }} />
          
          {/* 🔥 Кнопка геолокации теперь в правом верхнем углу */}
          <GeolocateButton onLocate={(lat, lng) => { setLat(lat); setLng(lng); }} />
        </MapContainer>
      </div>

      {/* 🔥 ПОДВАЛ: Fixed внизу, не скроллится */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-white border-t flex items-center justify-center z-[1000]">
        <span className="text-xs text-gray-500">
          📍 {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </div>
    </div>
  )
}