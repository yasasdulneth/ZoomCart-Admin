import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AdminModel } from '../models/admin.model.ts'
import { env } from '../config/env.ts'

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

export async function getProfile(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })
  return res.json({ admin: pickAdminResponse(req.admin) })
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })
  const { fullName, email } = req.body as { fullName?: string; email?: string }

  const patch: Record<string, unknown> = {}
  if (fullName !== undefined) {
    if (!fullName.trim()) return res.status(400).json({ message: 'fullName cannot be empty.' })
    patch.fullName = fullName.trim()
  }
  if (email !== undefined) {
    if (!email.trim()) return res.status(400).json({ message: 'email cannot be empty.' })
    patch.email = email.trim().toLowerCase()
  }

  try {
    const admin = await AdminModel.findByIdAndUpdate(req.admin._id, patch, { new: true })
    if (!admin) return res.status(404).json({ message: 'Admin not found.' })
    return res.json({ admin: pickAdminResponse(admin) })
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Email already exists.' })
    return res.status(500).json({ message: 'Could not update profile.' })
  }
}

export async function changePassword(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
  if (!currentPassword) return res.status(400).json({ message: 'currentPassword is required.' })
  if (!newPassword) return res.status(400).json({ message: 'newPassword is required.' })
  if (newPassword.length < 8) return res.status(400).json({ message: 'newPassword must be at least 8 characters.' })

  const admin = await AdminModel.findById(req.admin._id).select('+passwordHash')
  if (!admin) return res.status(404).json({ message: 'Admin not found.' })

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash)
  if (!ok) return res.status(400).json({ message: 'Current password is incorrect.' })

  admin.passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds)
  await admin.save()

  return res.json({ message: 'Password updated.' })
}

