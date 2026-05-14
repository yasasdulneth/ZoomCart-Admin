import { Router } from 'express'
import {
  deactivateEmployee,
  getEmployeeById,
  listEmployees,
  updateEmployee,
} from '../controllers/employee.controller.ts'
import { authMiddleware } from '../middleware/auth.middleware.ts'
import { restrictTo } from '../middleware/role.middleware.ts'

export const employeeRoutes = Router()

employeeRoutes.use(authMiddleware, restrictTo('SUPER_ADMIN'))

employeeRoutes.get('/', listEmployees)
employeeRoutes.get('/:id', getEmployeeById)
employeeRoutes.put('/:id', updateEmployee)
employeeRoutes.delete('/:id', deactivateEmployee)

