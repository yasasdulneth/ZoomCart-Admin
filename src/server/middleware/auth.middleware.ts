import type { NextFunction, Request, Response } from 'express'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.ts'
import { AdminModel } from '../models/admin.model.ts'

type JwtAdminPayload = {
  sub: string
  kind: 'admin'
}

function getBearerToken(req: Request): string | null {
  const raw = req.headers.authorization
  if (!raw) return null
  const [scheme, token] = raw.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return res.status(401).json({ message: 'Missing Authorization Bearer token.' })
    }

    const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload
    if (!decoded?.sub) {
      return res.status(401).json({ message: 'Invalid token.' })
    }

    // Admin token
    if (decoded.kind === 'admin') {
      const admin = await AdminModel.findById(decoded.sub).select('+passwordHash')
      if (!admin) return res.status(401).json({ message: 'Admin not found.' })
      if (admin.isActive === false) return res.status(403).json({ message: 'Admin account is inactive.' })
      req.admin = admin
      return next()
    }

    return res.status(403).json({ message: 'Not an admin token.' })
  } catch {
    return res.status(401).json({ message: 'Unauthorized.' })
  }
}

export function signAdminJwt(adminId: string): string {
  const payload: JwtAdminPayload = { sub: adminId, kind: 'admin' }
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] }
  return jwt.sign(payload, env.jwtSecret, options)
}

