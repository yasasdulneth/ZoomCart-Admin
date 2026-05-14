import type { NextFunction, Request, Response } from 'express'
import type { AdminRole } from '../models/admin.model.ts'

export function restrictTo(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = req.admin
    if (!admin) return res.status(401).json({ message: 'Admin authentication required.' })
    if (!roles.includes(admin.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' })
    }
    return next()
  }
}

