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
      className="bg-white text-blue-600 p-3 rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-50 font-bold text-xl z-[1000]"
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
    // 🔥 ИСПРАВЛЕНО: h-[100dvh] вместо h-screen для корректной работы на мобильных
    <div className="flex flex-col h-[100dvh] bg-gray-100 overflow-hidden touch-manipulation">
      <header className="bg-white p-3 shadow flex justify-between items-center shrink-0 z-[1000]">
        <button onClick={() => navigate(-1)} className="text-gray-600 font-bold px-2">✕ Отмена</button>
        <span className="font-semibold text-gray-800 text-sm sm:text-base">Ткни в место ловли</span>
        <button 
          onClick={handleConfirm} 
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-blue-700"
        >
          ✅ Готово
        </button>
      </header>

      {/* 🔥 ИСПРАВЛЕНО: flex-1 min-h-0 предотвращает выход за границы экрана */}
      <div className="relative flex-1 min-h-0 w-full z-0">
        <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full" zoomControl={true}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker setLatLng={(l, g) => { setLat(l); setLng(g); }} />
          
          <div className="absolute bottom-4 right-4 z-[1000]">
            <GeolocateButton onLocate={(lat, lng) => { setLat(lat); setLng(lng); }} />
          </div>
        </MapContainer>
      </div>

      <div className="p-3 text-center text-xs text-gray-500 shrink-0 bg-white border-t">
        Координаты: {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  )
}