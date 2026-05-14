import type { AdminDocument } from '../models/admin.model'

declare global {
  namespace Express {
    interface Request {
      admin?: AdminDocument
    }
  }
}

export {}

