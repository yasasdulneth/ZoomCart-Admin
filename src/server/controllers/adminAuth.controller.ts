import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AdminModel, type AdminRole } from '../models/admin.model.ts'
import { env } from '../config/env.ts'
import { signAdminJwt } from '../middleware/auth.middleware.ts'

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

export async function registerAdmin(req: Request, res: Response) {
  const { fullName, email, password, role } = req.body as {
    fullName?: string
    email?: string
    password?: string
    role?: AdminRole
  }

  if (!fullName?.trim()) return res.status(400).json({ message: 'fullName is required.' })
  if (!email?.trim()) return res.status(400).json({ message: 'email is required.' })
  if (!password) return res.status(400).json({ message: 'password is required.' })
  if (password.length < 8) return res.status(400).json({ message: 'password must be at least 8 characters.' })
  if (role !== 'SUPER_ADMIN' && role !== 'STAFF') return res.status(400).json({ message: 'Invalid role.' })

  const exists = await AdminModel.findOne({ email: email.trim().toLowerCase() })
  if (exists) return res.status(409).json({ message: 'Email already exists.' })

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds)
  const admin = await AdminModel.create({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role,
    isActive: true,
  })

  return res.status(201).json({ admin: pickAdminResponse(admin) })
}

export async function loginAdmin(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email?.trim()) return res.status(400).json({ message: 'email is required.' })
  if (!password) return res.status(400).json({ message: 'password is required.' })

  const admin = await AdminModel.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
  if (!admin) return res.status(401).json({ message: 'Invalid email or password.' })
  if (admin.isActive === false) return res.status(403).json({ message: 'Admin account is inactive.' })

  const ok = await bcrypt.compare(password, admin.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Invalid email or password.' })

  const token = signAdminJwt(String(admin._id))
  return res.json({ token, admin: pickAdminResponse(admin) })
}

export async function meAdmin(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })
  return res.json({ admin: pickAdminResponse(req.admin) })
}

export async function logoutAdmin(_req: Request, res: Response) {
  return res.json({ message: 'Logged out. Clear token on client.' })
}

