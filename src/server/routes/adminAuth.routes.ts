import { Router } from 'express'
import { loginAdmin, logoutAdmin, meAdmin, registerAdmin } from '../controllers/adminAuth.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'
import { restrictTo } from '../middleware/role.middleware.ts'

export const adminAuthRoutes = Router()

// Only SUPER_ADMIN can register new admins/employees.
adminAuthRoutes.post('/register', authMiddleware, restrictTo('SUPER_ADMIN'), registerAdmin)
adminAuthRoutes.post('/login', loginAdmin)
adminAuthRoutes.get('/me', authMiddleware, meAdmin)
adminAuthRoutes.post('/logout', authMiddleware, logoutAdmin)

