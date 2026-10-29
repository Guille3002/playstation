// Servicio PAGOS — cobra una compra y emite un número de orden.
// Microservicio independiente: el cobro es SIMULADO (siempre se aprueba si los datos son válidos).
// No sabe de carritos ni bibliotecas; solo recibe juegos con precio y devuelve una orden.
import express from 'express'

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 4005

// Historial de pagos en memoria.
const PAGOS = []
let siguienteOrden = 1001

app.get('/salud', (req, res) => res.json({ servicio: 'pagos', ok: true }))

app.get('/pagos', (req, res) => {
  res.json(PAGOS)
})

app.post('/pagos', (req, res) => {
  const items = req.body && req.body.items
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'No hay juegos para cobrar' })
  }
  if (items.some(j => typeof (j.precioFinal ?? j.precio) !== 'number')) {
    return res.status(400).json({ error: 'Hay un juego sin precio' })
  }

  // El total lo calcula PAGOS (no confía en un total que venga de afuera).
  const centavos = items.reduce((s, j) => s + Math.round((j.precioFinal ?? j.precio) * 100), 0)
  const pago = {
    orden: `PS-${siguienteOrden++}`,
    estado: 'aprobado',
    total: centavos / 100,
    juegos: items.map(j => j.titulo),
    fecha: new Date().toISOString(),
  }
  PAGOS.unshift(pago)
  console.log(`[pagos] orden ${pago.orden} aprobada por $${pago.total}`)
  res.status(201).json(pago)
})

app.listen(PORT, () => console.log(`[pagos] escuchando en :${PORT}`))
