// Servicio RESEÑAS — puntajes y comentarios de los jugadores.
// Microservicio independiente: guarda sus reseñas (en memoria) por id de juego
// y calcula el promedio de estrellas. No sabe nada más de los juegos.
import express from 'express'

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 4007

// "Base de datos" en memoria, con algunas reseñas de ejemplo.
const RESENAS = [
  { juegoId: 1, autor: 'KratosFan_GT', estrellas: 5, texto: 'La historia entre Kratos y Atreus es brutal. De lo mejor de PS5.' },
  { juegoId: 1, autor: 'mafer.plays', estrellas: 5, texto: 'El combate con el hacha nunca aburre. Gráficos increíbles.' },
  { juegoId: 1, autor: 'Diego_R', estrellas: 4, texto: 'Excelente, aunque algunas partes con Atreus se sienten largas.' },
  { juegoId: 2, autor: 'TrepaMuros', estrellas: 5, texto: 'Columpiarse por Nueva York con los dos Spider-Man es otra cosa.' },
  { juegoId: 2, autor: 'ana_lu', estrellas: 4, texto: 'Muy divertido y fluido. La campaña se me hizo corta.' },
  { juegoId: 3, autor: 'Ellie4ever', estrellas: 5, texto: 'Duro, emocional y con una jugabilidad impecable.' },
  { juegoId: 3, autor: 'JP_Gamer', estrellas: 4, texto: 'La historia divide opiniones, pero el nivel técnico es enorme.' },
  { juegoId: 4, autor: 'Piloto502', estrellas: 5, texto: 'Con volante es una experiencia completa. El modo café engancha.' },
  { juegoId: 4, autor: 'carlos.m', estrellas: 4, texto: 'Muy realista. Se necesita paciencia para desbloquear autos.' },
  { juegoId: 5, autor: 'AloyMain', estrellas: 5, texto: 'El mundo abierto más lindo que he visto. Las máquinas son épicas.' },
  { juegoId: 5, autor: 'sofi_rpg', estrellas: 4, texto: 'Mucho contenido. A veces demasiados íconos en el mapa.' },
  { juegoId: 6, autor: 'SamuraiChapin', estrellas: 5, texto: 'El modo Kurosawa en blanco y negro es una obra de arte.' },
  { juegoId: 6, autor: 'luisfer', estrellas: 5, texto: 'Los duelos con katana son lo mejor. Muy recomendado.' },
].map((r, i) => ({ id: i + 1, fecha: '2026-10-01T12:00:00.000Z', ...r }))

let siguienteId = RESENAS.length + 1

// Promedio y cantidad de reseñas por juego.
function resumen() {
  const porJuego = {}
  for (const r of RESENAS) {
    porJuego[r.juegoId] ??= { juegoId: r.juegoId, suma: 0, cantidad: 0 }
    porJuego[r.juegoId].suma += r.estrellas
    porJuego[r.juegoId].cantidad++
  }
  return Object.values(porJuego).map(({ juegoId, suma, cantidad }) => ({
    juegoId,
    promedio: Math.round((suma / cantidad) * 10) / 10,
    cantidad,
  }))
}

app.get('/salud', (req, res) => res.json({ servicio: 'resenas', ok: true }))

app.get('/resenas', (req, res) => {
  res.json(resumen())
})

app.get('/resenas/:juegoId', (req, res) => {
  const juegoId = Number(req.params.juegoId)
  res.json(RESENAS.filter(r => r.juegoId === juegoId).reverse()) // las más nuevas primero
})

app.post('/resenas/:juegoId', (req, res) => {
  const juegoId = Number(req.params.juegoId)
  const { autor, estrellas, texto } = req.body || {}
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    return res.status(400).json({ error: 'Las estrellas van de 1 a 5' })
  }
  if (!texto || !String(texto).trim()) {
    return res.status(400).json({ error: 'Escribí un comentario' })
  }
  const resena = {
    id: siguienteId++,
    juegoId,
    autor: String(autor || '').trim().slice(0, 30) || 'Anónimo',
    estrellas,
    texto: String(texto).trim().slice(0, 300),
    fecha: new Date().toISOString(),
  }
  RESENAS.push(resena)
  res.status(201).json(resena)
})

app.listen(PORT, () => console.log(`[resenas] escuchando en :${PORT}`))
