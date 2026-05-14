import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { env } from './config/env.ts'

import { adminAuthRoutes } from './routes/adminAuth.routes.ts'
import { employeeRoutes } from './routes/employee.routes.ts'
import { adminProductRoutes } from './routes/adminProduct.routes.ts'
import { inventoryRoutes } from './routes/inventory.routes.ts'
import { adminPaymentRoutes } from './routes/adminPayment.routes.ts'
import { adminNotificationRoutes } from './routes/adminNotification.routes.ts'
import { adminProfileRoutes } from './routes/adminProfile.routes.ts'
import { dashboardRoutes } from './routes/dashboard.routes.ts'

export const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
    credentials: true,
  }),
)

app.get('/health', (_req, res) =>
  res.json({ ok: true, mongoReady: mongoose.connection.readyState === 1 }),
)

/** Respond with JSON until MongoDB is up (server listens immediately; DB may still be connecting). */
function requireMongo(_req: express.Request, res: express.Response, next: express.NextFunction) {
  if (mongoose.connection.readyState === 1) return next()
  return res.status(503).json({
    message:
      'Database unavailable. The API is running but MongoDB is not connected yet. Check MONGO_URI and Atlas IP allowlist (or wait for retry).',
  })
}

// ADMIN ROUTES
app.use('/api', requireMongo)
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin/employees', employeeRoutes)
app.use('/api/admin/products', adminProductRoutes)
app.use('/api/admin/inventory', inventoryRoutes)
app.use('/api/admin/payments', adminPaymentRoutes)
app.use('/api/admin/notifications', adminNotificationRoutes)
app.use('/api/admin/profile', adminProfileRoutes)
app.use('/api/admin/dashboard', dashboardRoutes)

// 404
app.use((_req, res) => res.status(404).json({ message: 'Not found.' }))

