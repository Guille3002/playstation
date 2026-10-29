// Servicio GATEWAY — la ÚNICA puerta del sistema (:8080).
// Sirve la mini web y enruta a los servicios internos. Clave del lab:
// les habla por su NOMBRE DE SERVICIO (http://catalogo:4001), y la red interna
// de Docker lo resuelve sola. El gateway es el único que publica un puerto afuera.
//
// Además ORQUESTA: varias rutas combinan respuestas de más de un servicio
// (catálogo + ofertas + reseñas, o carrito → pagos → biblioteca).
import express from 'express'

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 8080

// Las URLs vienen por variable de entorno (las define el compose.yml).
// Si corrieras fuera de Docker, el valor por defecto apunta a localhost.
const SERVICIOS = {
  catalogo:   process.env.CATALOGO_URL   || 'http://localhost:4001',
  biblioteca: process.env.BIBLIOTECA_URL || 'http://localhost:4002',
  ofertas:    process.env.OFERTAS_URL    || 'http://localhost:4003',
  carrito:    process.env.CARRITO_URL    || 'http://localhost:4004',
  pagos:      process.env.PAGOS_URL      || 'http://localhost:4005',
  deseos:     process.env.DESEOS_URL     || 'http://localhost:4006',
  resenas:    process.env.RESENAS_URL    || 'http://localhost:4007',
}

// Error que usamos cuando un servicio no responde (apagado, caído, lento).
class ServicioCaido extends Error {
  constructor(servicio) {
    super(`El servicio ${servicio} no está disponible`)
    this.servicio = servicio
  }
}

// "Cortacircuito": si un servicio acaba de fallar, durante unos segundos ni lo intentamos
// y respondemos "no disponible" al instante. Así un contenedor apagado no vuelve lenta
// toda la página (el DNS de Docker tarda ~5 s en responder por un nombre que no existe).
const PAUSA_SI_FALLA = 5000
const caidoHasta = {}

// Le habla a un servicio interno. Devuelve { ok, status, data }.
// Si el servicio no contesta a tiempo, lanza ServicioCaido (no se cuelga la página).
// `sondeo: true` ignora el cortacircuito (lo usa /api/estado para notar cuando un servicio vuelve).
async function llamar(servicio, ruta, { method = 'GET', body, timeout = 2500, sondeo = false } = {}) {
  if (!sondeo && caidoHasta[servicio] > Date.now()) throw new ServicioCaido(servicio)
  let r
  try {
    r = await fetch(SERVICIOS[servicio] + ruta, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    })
  } catch {
    caidoHasta[servicio] = Date.now() + PAUSA_SI_FALLA
    throw new ServicioCaido(servicio)
  }
  delete caidoHasta[servicio]
  const data = await r.json().catch(() => null)
  return { ok: r.ok, status: r.status, data }
}

// Para datos "de adorno" (ofertas, reseñas): si el servicio falla, seguimos sin ellos.
async function opcional(promesa) {
  try {
    const r = await promesa
    return r.ok ? r.data : null
  } catch {
    return null
  }
}

// Express 4 no atrapa errores de funciones async: este envoltorio los manda al manejador de abajo.
const ruta = fn => (req, res, next) => fn(req, res).catch(next)

// Aplica el descuento de una oferta (si hay) al precio del juego.
function conPrecio(juego, oferta) {
  const descuento = oferta ? oferta.descuento : 0
  return {
    ...juego,
    descuento,
    etiqueta: oferta ? oferta.etiqueta : null,
    precioFinal: Math.round(juego.precio * (100 - descuento)) / 100,
  }
}

// Un juego del CATÁLOGO con el precio de OFERTAS ya aplicado (o null si no existe).
async function juegoConPrecio(id) {
  const rc = await llamar('catalogo', `/juegos/${id}`)
  if (!rc.ok) return null
  const oferta = await opcional(llamar('ofertas', `/ofertas/${id}`))
  return conPrecio(rc.data, oferta)
}

// Sirve la mini web (public/index.html).
app.use(express.static('public'))

app.get('/salud', (req, res) => res.json({ servicio: 'gateway', ok: true }))

// ---------- Catálogo ----------
// Tres servicios en una sola respuesta: CATÁLOGO (obligatorio) + OFERTAS + RESEÑAS (opcionales).
app.get('/api/catalogo', ruta(async (req, res) => {
  const [rc, ofertas, resenas] = await Promise.all([
    llamar('catalogo', '/juegos'),
    opcional(llamar('ofertas', '/ofertas')),
    opcional(llamar('resenas', '/resenas')),
  ])
  res.json(rc.data.map(juego => {
    const oferta = ofertas && ofertas.find(o => o.juegoId === juego.id)
    const resumen = resenas && resenas.find(r => r.juegoId === juego.id)
    return {
      ...conPrecio(juego, oferta),
      rating: resumen ? resumen.promedio : null,
      resenas: resumen ? resumen.cantidad : 0,
    }
  }))
}))

// ---------- Mi biblioteca ----------
app.get('/api/biblioteca', ruta(async (req, res) => {
  const r = await llamar('biblioteca', '/mios')
  res.json(r.data)
}))

// COMPRA DIRECTA (la del lab original): catálogo → biblioteca, sin pasar por el carrito.
app.post('/api/comprar/:id', ruta(async (req, res) => {
  const juego = await juegoConPrecio(req.params.id)
  if (!juego) return res.status(404).json({ error: 'Juego no encontrado' })
  const rb = await llamar('biblioteca', '/mios', { method: 'POST', body: juego })
  res.status(201).json(rb.data)
}))

// ---------- Carrito ----------
app.get('/api/carrito', ruta(async (req, res) => {
  const r = await llamar('carrito', '/items')
  res.json(r.data)
}))

// Agregar: el gateway arma el juego (catálogo + ofertas) y se lo entrega al CARRITO.
app.post('/api/carrito/:id', ruta(async (req, res) => {
  const juego = await juegoConPrecio(req.params.id)
  if (!juego) return res.status(404).json({ error: 'Juego no encontrado' })
  const r = await llamar('carrito', '/items', { method: 'POST', body: juego })
  res.status(r.status).json(r.data)
}))

app.delete('/api/carrito/:id', ruta(async (req, res) => {
  const r = await llamar('carrito', `/items/${req.params.id}`, { method: 'DELETE' })
  res.json(r.data)
}))

// PAGAR: acá colaboran CUATRO microservicios.
// 1) CARRITO entrega los juegos   2) PAGOS cobra y da un número de orden
// 3) BIBLIOTECA guarda cada juego  4) se vacía el CARRITO y se limpia la lista de DESEOS
app.post('/api/checkout', ruta(async (req, res) => {
  const { data: carrito } = await llamar('carrito', '/items')
  if (!carrito.items.length) return res.status(400).json({ error: 'El carrito está vacío' })

  // Antes de cobrar, nos aseguramos de que la biblioteca pueda recibir los juegos.
  await llamar('biblioteca', '/salud')

  const pago = await llamar('pagos', '/pagos', { method: 'POST', body: { items: carrito.items } })
  if (!pago.ok) return res.status(402).json(pago.data)

  for (const juego of carrito.items) {
    await llamar('biblioteca', '/mios', { method: 'POST', body: juego })
  }
  await llamar('carrito', '/items', { method: 'DELETE' })
  // Si "deseos" está caído no pasa nada: la compra ya se hizo.
  await Promise.all(carrito.items.map(j => opcional(llamar('deseos', `/deseos/${j.id}`, { method: 'DELETE' }))))

  res.status(201).json({ orden: pago.data, juegos: carrito.items })
}))

// ---------- Lista de deseos ----------
app.get('/api/deseos', ruta(async (req, res) => {
  const r = await llamar('deseos', '/deseos')
  res.json(r.data)
}))

app.post('/api/deseos/:id', ruta(async (req, res) => {
  const rc = await llamar('catalogo', `/juegos/${req.params.id}`)
  if (!rc.ok) return res.status(404).json({ error: 'Juego no encontrado' })
  const r = await llamar('deseos', '/deseos', { method: 'POST', body: rc.data })
  res.status(r.status).json(r.data)
}))

app.delete('/api/deseos/:id', ruta(async (req, res) => {
  const r = await llamar('deseos', `/deseos/${req.params.id}`, { method: 'DELETE' })
  res.json(r.data)
}))

// ---------- Reseñas ----------
app.get('/api/resenas/:id', ruta(async (req, res) => {
  const r = await llamar('resenas', `/resenas/${req.params.id}`)
  res.json(r.data)
}))

app.post('/api/resenas/:id', ruta(async (req, res) => {
  const r = await llamar('resenas', `/resenas/${req.params.id}`, { method: 'POST', body: req.body })
  res.status(r.status).json(r.data)
}))

// ---------- Estado del sistema ----------
// Le pregunta /salud a cada servicio. La web lo muestra como luces verdes/rojas:
// probá `docker compose stop carrito` y mirá cómo cambia.
app.get('/api/estado', ruta(async (req, res) => {
  const estado = await Promise.all(Object.keys(SERVICIOS).map(async servicio => {
    const inicio = Date.now()
    try {
      const r = await llamar(servicio, '/salud', { timeout: 1500, sondeo: true })
      return { servicio, url: SERVICIOS[servicio], ok: r.ok, ms: Date.now() - inicio }
    } catch {
      return { servicio, url: SERVICIOS[servicio], ok: false, ms: null }
    }
  }))
  res.json([{ servicio: 'gateway', url: `:${PORT}`, ok: true, ms: 0 }, ...estado])
}))

// Si un servicio está caído respondemos 503 con su nombre, en vez de dejar la petición colgada.
app.use((err, req, res, next) => {
  if (err instanceof ServicioCaido) {
    console.warn(`[gateway] ${err.message}`)
    return res.status(503).json({ error: err.message, servicio: err.servicio })
  }
  console.error(err)
  res.status(500).json({ error: 'Error interno del gateway' })
})

app.listen(PORT, () => console.log(`[gateway] PlayStation Store en http://localhost:${PORT}`))
