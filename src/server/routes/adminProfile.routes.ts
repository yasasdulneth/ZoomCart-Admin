import { Router } from 'express'
import { changePassword, getProfile, updateProfile } from '../controllers/adminProfile.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'

export const adminProfileRoutes = Router()

adminProfileRoutes.use(authMiddleware)

adminProfileRoutes.get('/', getProfile)
adminProfileRoutes.put('/', updateProfile)
adminProfileRoutes.put('/change-password', changePassword)

