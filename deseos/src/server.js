// Servicio DESEOS — la lista de deseos (juegos guardados para después).
// Microservicio independiente: guarda su propia lista (en memoria).
// Igual que la biblioteca: recibe un juego y lo guarda, sin preguntar de dónde viene.
import express from 'express'

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 4006

// "Base de datos" en memoria.
const DESEOS = []

app.get('/salud', (req, res) => res.json({ servicio: 'deseos', ok: true }))

app.get('/deseos', (req, res) => {
  res.json(DESEOS)
})

app.post('/deseos', (req, res) => {
  const juego = req.body
  if (!juego || !juego.id) {
    return res.status(400).json({ error: 'Falta el juego' })
  }
  if (!DESEOS.find(j => j.id === juego.id)) DESEOS.push(juego)
  res.status(201).json(DESEOS)
})

app.delete('/deseos/:id', (req, res) => {
  const i = DESEOS.findIndex(j => j.id === Number(req.params.id))
  if (i !== -1) DESEOS.splice(i, 1)
  res.json(DESEOS)
})

app.listen(PORT, () => console.log(`[deseos] escuchando en :${PORT}`))
