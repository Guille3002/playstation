// Servicio CARRITO — los juegos que el usuario quiere comprar.
// Microservicio independiente: guarda su propia lista (en memoria) y calcula el total.
// Recibe el juego ya armado (con su precio final); no le pregunta nada a nadie.
import express from 'express'

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 4004

// "Base de datos" en memoria.
const ITEMS = []

// Sumamos en centavos para no arrastrar errores de decimales (0.1 + 0.2 ...).
function estado() {
  const centavos = ITEMS.reduce((s, j) => s + Math.round((j.precioFinal ?? j.precio) * 100), 0)
  return { items: ITEMS, total: centavos / 100 }
}

app.get('/salud', (req, res) => res.json({ servicio: 'carrito', ok: true }))

app.get('/items', (req, res) => {
  res.json(estado())
})

app.post('/items', (req, res) => {
  const juego = req.body
  if (!juego || !juego.id || typeof juego.precio !== 'number') {
    return res.status(400).json({ error: 'Falta el juego o su precio' })
  }
  // un mismo juego no se agrega dos veces
  if (!ITEMS.find(j => j.id === juego.id)) ITEMS.push(juego)
  res.status(201).json(estado())
})

app.delete('/items/:id', (req, res) => {
  const i = ITEMS.findIndex(j => j.id === Number(req.params.id))
  if (i !== -1) ITEMS.splice(i, 1)
  res.json(estado())
})

// Vaciar el carrito (lo usa el gateway después de pagar).
app.delete('/items', (req, res) => {
  ITEMS.length = 0
  res.json(estado())
})

app.listen(PORT, () => console.log(`[carrito] escuchando en :${PORT}`))
