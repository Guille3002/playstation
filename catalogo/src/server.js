// Servicio CATÁLOGO — la tienda: lista los juegos a la venta.
// Es un microservicio independiente: su propia API y sus propios datos (en memoria).
// No sabe nada de la biblioteca ni del gateway; solo responde por sus juegos.
import express from 'express'

const app = express()
const PORT = process.env.PORT || 4001

// "Base de datos" en memoria (para el lab no usamos una base real).
const JUEGOS = [
  { id: 1, titulo: 'God of War Ragnarök',      precio: 69.99, genero: 'Acción/Aventura' },
  { id: 2, titulo: "Marvel's Spider-Man 2",    precio: 69.99, genero: 'Acción' },
  { id: 3, titulo: 'The Last of Us Part II',   precio: 39.99, genero: 'Aventura' },
  { id: 4, titulo: 'Gran Turismo 7',           precio: 59.99, genero: 'Carreras' },
  { id: 5, titulo: 'Horizon Forbidden West',   precio: 49.99, genero: 'RPG de acción' },
  { id: 6, titulo: 'Ghost of Tsushima',        precio: 49.99, genero: 'Acción/Aventura' },
]

// Lo usa el HEALTHCHECK del Dockerfile y el panel de estado del gateway.
app.get('/salud', (req, res) => res.json({ servicio: 'catalogo', ok: true }))

app.get('/juegos', (req, res) => {
  res.json(JUEGOS)
})

app.get('/juegos/:id', (req, res) => {
  const juego = JUEGOS.find(j => j.id === Number(req.params.id))
  if (!juego) return res.status(404).json({ error: 'Juego no encontrado' })
  res.json(juego)
})

app.listen(PORT, () => console.log(`[catalogo] escuchando en :${PORT}`))
