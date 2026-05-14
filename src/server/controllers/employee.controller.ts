import type { Request, Response } from 'express'
import { AdminModel, type AdminRole } from '../models/admin.model.ts'

function pickAdminResponse(admin: any) {
  return {
    id: String(admin._id),
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }
}

export async function listEmployees(_req: Request, res: Response) {
  const admins = await AdminModel.find().sort({ createdAt: -1 })
  return res.json({ employees: admins.map(pickAdminResponse) })
}

export async function getEmployeeById(req: Request, res: Response) {
  const admin = await AdminModel.findById(req.params.id)
  if (!admin) return res.status(404).json({ message: 'Employee not found.' })
  return res.json({ employee: pickAdminResponse(admin) })
}

export async function updateEmployee(req: Request, res: Response) {
  const { fullName, role, isActive } = req.body as {
    fullName?: string
    role?: AdminRole
    isActive?: boolean
  }

  const patch: Record<string, unknown> = {}
  if (fullName !== undefined) {
    if (!String(fullName).trim()) return res.status(400).json({ message: 'fullName cannot be empty.' })
    patch.fullName = String(fullName).trim()
  }
  if (role !== undefined) {
    if (role !== 'SUPER_ADMIN' && role !== 'STAFF') return res.status(400).json({ message: 'Invalid role.' })
    patch.role = role
  }
  if (isActive !== undefined) patch.isActive = Boolean(isActive)

  const admin = await AdminModel.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!admin) return res.status(404).json({ message: 'Employee not found.' })
  return res.json({ employee: pickAdminResponse(admin) })
}

export async function deactivateEmployee(req: Request, res: Response) {
  const admin = await AdminModel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!admin) return res.status(404).json({ message: 'Employee not found.' })
  return res.json({ message: 'Employee deactivated.', employee: pickAdminResponse(admin) })
}

