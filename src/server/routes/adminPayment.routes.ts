import { Router } from 'express'
import { getPaymentById, listPayments, verifyPayment, deletePayment } from '../controllers/payment.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'
import { restrictTo } from '../middleware/role.middleware.ts'

export const adminPaymentRoutes = Router()

adminPaymentRoutes.use(authMiddleware, restrictTo('SUPER_ADMIN'))

adminPaymentRoutes.get('/', listPayments)
adminPaymentRoutes.get('/:id', getPaymentById)
adminPaymentRoutes.put('/:id/verify', verifyPayment)
adminPaymentRoutes.delete('/:id', deletePayment)

