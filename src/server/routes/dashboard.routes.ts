import { Router } from 'express'
import { getDashboardCharts } from '../controllers/dashboard.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'
import { restrictTo } from '../middleware/role.middleware.ts'

export const dashboardRoutes = Router()

dashboardRoutes.use(authMiddleware, restrictTo('SUPER_ADMIN'))

dashboardRoutes.get('/charts', getDashboardCharts)
