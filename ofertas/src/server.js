// Servicio OFERTAS — qué juegos tienen descuento y de cuánto.
// Microservicio independiente: solo conoce ids de juegos y porcentajes.
// No sabe precios ni títulos; el gateway combina esto con el catálogo.
import express from 'express'

const app = express()
const PORT = process.env.PORT || 4003

// "Base de datos" en memoria.
const OFERTAS = [
  { juegoId: 2, descuento: 20, etiqueta: 'Oferta semanal' },
  { juegoId: 3, descuento: 50, etiqueta: 'Mitad de precio' },
  { juegoId: 5, descuento: 30, etiqueta: 'Oferta especial' },
  { juegoId: 6, descuento: 25, etiqueta: 'Oferta semanal' },
]

app.get('/salud', (req, res) => res.json({ servicio: 'ofertas', ok: true }))

app.get('/ofertas', (req, res) => {
  res.json(OFERTAS)
})

app.get('/ofertas/:juegoId', (req, res) => {
  const oferta = OFERTAS.find(o => o.juegoId === Number(req.params.juegoId))
  if (!oferta) return res.status(404).json({ error: 'Ese juego no tiene oferta' })
  res.json(oferta)
})

app.listen(PORT, () => console.log(`[ofertas] escuchando en :${PORT}`))
