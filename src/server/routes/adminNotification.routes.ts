import { Router } from 'express'
import {
  createNotification,
  deleteNotification,
  listAdminNotifications,
  markNotificationRead,
} from '../controllers/notification.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'

export const adminNotificationRoutes = Router()

adminNotificationRoutes.use(authMiddleware)

adminNotificationRoutes.get('/', listAdminNotifications)
adminNotificationRoutes.post('/', createNotification)
adminNotificationRoutes.put('/:id/read', markNotificationRead)
adminNotificationRoutes.delete('/:id', deleteNotification)

