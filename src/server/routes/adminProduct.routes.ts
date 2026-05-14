import { Router } from 'express'
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'

export const adminProductRoutes = Router()

adminProductRoutes.use(authMiddleware)

adminProductRoutes.get('/', listProducts)
adminProductRoutes.get('/:id', getProductById)
adminProductRoutes.post('/', createProduct)
adminProductRoutes.put('/:id', updateProduct)
adminProductRoutes.delete('/:id', deleteProduct)

