// Servicio BIBLIOTECA — los juegos que el usuario YA compró.
// Microservicio independiente: guarda su propia lista (en memoria).
// No sabe de dónde salen los juegos; solo recibe uno y lo guarda.
import express from 'express'

const app = express()
app.use(express.json()) // para poder leer el body JSON en el POST
const PORT = process.env.PORT || 4002

// "Base de datos" en memoria.
const MIOS = []

// Lo usa el HEALTHCHECK del Dockerfile y el panel de estado del gateway.
app.get('/salud', (req, res) => res.json({ servicio: 'biblioteca', ok: true }))

app.get('/mios', (req, res) => {
  res.json(MIOS)
})

app.post('/mios', (req, res) => {
  const juego = req.body
  if (!juego || !juego.id) {
    return res.status(400).json({ error: 'Falta el juego' })
  }
  // evitamos duplicados
  if (!MIOS.find(j => j.id === juego.id)) MIOS.push(juego)
  res.status(201).json({ ok: true, biblioteca: MIOS })
})

app.listen(PORT, () => console.log(`[biblioteca] escuchando en :${PORT}`))
