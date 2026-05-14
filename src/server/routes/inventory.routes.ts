import { Router } from 'express'
import { inventoryList, lowStock, updateStock, updateThreshold } from '../controllers/inventory.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'

export const inventoryRoutes = Router()

inventoryRoutes.use(authMiddleware)

inventoryRoutes.get('/', inventoryList)
inventoryRoutes.get('/low-stock', lowStock)
inventoryRoutes.put('/:productId/stock', updateStock)
inventoryRoutes.put('/:productId/threshold', updateThreshold)

