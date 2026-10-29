# PlayStation Store · lab de microservicios con Docker

Lab guiado de la **Clase 22** (Programación Web · URL). Levantamos una tienda de juegos hecha de
**8 contenedores** (un gateway + 7 microservicios) con **Docker Compose**, y la vemos en **Docker Desktop**.

## Qué hay adentro
```
clase22-microservicios-docker/
├── gateway/        la ÚNICA puerta (:8080) + la web. Enruta y orquesta.
├── catalogo/       :4001  juegos a la venta
├── biblioteca/     :4002  juegos que ya compraste
├── ofertas/        :4003  descuentos por juego
├── carrito/        :4004  juegos por comprar + total
├── pagos/          :4005  cobro simulado + número de orden
├── deseos/         :4006  lista de deseos
├── resenas/        :4007  estrellas y comentarios
├── compose.yml             solución (el compose completo que funciona)
└── compose.ejercicio.yml   esqueleto con TODO para llenar en clase
```
La app ya viene **prefabricada**: en el lab no se programa — se escribe el `compose.yml` y se
construyen/levantan las imágenes con Docker. Todo es Node + Express, sin base de datos (datos en
memoria) para que el foco sea Docker. Cada servicio tiene su `Dockerfile`, su `.dockerignore` y una
ruta `GET /salud` que usa el `HEALTHCHECK`.

## Arquitectura
```
                              ┌→ catalogo   :4001
                              ├→ biblioteca :4002
                              ├→ ofertas    :4003
navegador → gateway (:8080) ──┼→ carrito    :4004
                              ├→ pagos      :4005
                              ├→ deseos     :4006
                              └→ resenas    :4007
```
Solo el **gateway** se expone al exterior. Los servicios se encuentran entre sí por su **nombre**
(`catalogo`, `carrito`, …): Docker Compose crea una red interna y resuelve esos nombres solo.
Ningún microservicio conoce a los otros: **el gateway es el que los combina**.

### Dónde se ven los microservicios colaborando
| En la web | Qué hace el gateway |
|---|---|
| Ver el catálogo | pide los juegos a **catalogo**, los descuentos a **ofertas** y el promedio de estrellas a **resenas**, y devuelve una sola lista |
| Agregar al carrito | arma el juego (**catalogo** + **ofertas**) y se lo entrega a **carrito** |
| **Pagar** | **carrito** entrega los juegos → **pagos** cobra y genera la orden `PS-1001` → **biblioteca** los guarda → se vacía el **carrito** y se limpian de **deseos** |
| ♡ Lista de deseos | pide el juego a **catalogo** y lo guarda en **deseos** |
| Detalle del juego | lee y publica reseñas en **resenas** |
| Indicador `8/8 servicios` | consulta `GET /salud` de cada contenedor cada 4 s |

### Tolerancia a fallas
Si apagás un servicio, la tienda **no se cae**: solo esa sección muestra "no disponible".
```bash
docker compose stop carrito    # el indicador pasa a 7/8 y el carrito muestra un aviso
docker compose stop ofertas    # el catálogo sigue andando, pero sin descuentos
docker compose start carrito ofertas   # en unos segundos todo vuelve solo
```
El gateway corta cada llamada a los 2,5 s y, si un servicio acaba de fallar, durante 5 s responde
"no disponible" al instante (cortacircuito) para que la página no se ponga lenta.

## Pasos del lab (Docker Desktop ya instalado)
1. **Verificar Docker**: abrí Docker Desktop (ballena en verde) y corré `docker run hello-world`.
2. **Ciclo de vida** (en Docker Desktop, botones Start/Stop/Delete) ↔ CLI: `docker ps`, `docker stop`, `docker rm`.
3. **Recorré** las carpetas de servicios y sus `Dockerfile` (fijate en el `HEALTHCHECK`).
4. **Escribí el `compose.yml`** (usá `compose.ejercicio.yml`, llená los `TODO`).
5. **Levantá todo**:
   ```bash
   docker compose up --build
   ```
   El gateway espera a que los 7 servicios estén **healthy** (`depends_on: condition: service_healthy`).
6. En **Docker Desktop → Containers**: vas a ver el stack con los 8 contenedores en verde.
7. **Probalo**: abrí http://localhost:8080 → *Agregar al carrito* → 🛒 → *Pagar* → aparece en *Mi biblioteca*.
8. **Apagá un servicio** (ver "Tolerancia a fallas") y mirá el indicador de estado en la web.
9. **Inspeccioná** en Docker Desktop: Logs de cada contenedor (en `pagos` vas a ver cada orden aprobada).
10. **Escalá / apagá**:
    ```bash
    docker compose up --scale catalogo=2   # opcional
    docker compose down
    ```

## API del gateway
| Método | Ruta | Servicios |
|---|---|---|
| GET | `/api/catalogo` | catalogo + ofertas + resenas |
| GET | `/api/biblioteca` | biblioteca |
| POST | `/api/comprar/:id` | catalogo → biblioteca (compra directa, la del lab original) |
| GET / POST / DELETE | `/api/carrito` · `/api/carrito/:id` | catalogo + ofertas → carrito |
| POST | `/api/checkout` | carrito → pagos → biblioteca → deseos |
| GET / POST / DELETE | `/api/deseos` · `/api/deseos/:id` | catalogo → deseos |
| GET / POST | `/api/resenas/:id` | resenas |
| GET | `/api/estado` | `/salud` de todos |

## Troubleshooting
- **Puerto 8080 ocupado**: cambiá el mapeo a `"8081:8080"` en el `compose.yml` y abrí `:8081`.
- **El gateway responde pero una sección dice "no disponible"**: revisá que ese contenedor esté
  corriendo (`docker compose ps`) y que las URLs del `environment` usen los **nombres de servicio**
  (`http://carrito:4004`), no `localhost`.
- **El gateway no arranca y dice `dependency failed`**: algún servicio no pasó su healthcheck;
  mirá sus logs con `docker compose logs <servicio>`.
- **Cambié código y no se refleja**: volvé a correr con `--build` para reconstruir la imagen.
- **Se borró lo que compré**: es normal, los datos viven en memoria y se pierden al reiniciar un contenedor.

## Nota
Probado con Docker 29 (Docker Desktop en Windows): `docker compose up --build` levanta los 8
contenedores en estado healthy, el flujo completo de compra funciona y la web se adapta a celular.
