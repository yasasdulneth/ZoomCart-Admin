import { connectMongo } from './config/mongo.ts'
import { app } from './app.ts'
import { env } from './config/env.ts'

/**
 * Listen immediately so the HTTP port is open (Vite `/api` proxy gets JSON, not HTML 502 pages).
 * MongoDB connects in the background; `/api/*` returns 503 JSON until ready.
 */
app.listen(env.port, () => {
  console.log(`[ZoomCart] API listening on port ${env.port}`)
  console.log('[ZoomCart] Connecting to MongoDB in the background…')
})

void connectMongo()
  .then(() => console.log('[ZoomCart] MongoDB ready; API fully online.'))
  .catch((err) => {
    console.error('[ZoomCart] MongoDB connection error:', err)
  })

