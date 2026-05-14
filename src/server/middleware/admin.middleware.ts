import type { NextFunction, Request, Response } from 'express'

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.admin) {
    return res.status(401).json({ message: 'Admin authentication required.' })
  }
  return next()
}

