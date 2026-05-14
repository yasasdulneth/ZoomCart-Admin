import type { Request, Response } from 'express'
import { NotificationModel, type NotificationTargetAudience, type NotificationType } from '../models/notification.model.ts'

export async function listAdminNotifications(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })

  const adminId = req.admin._id
  const or: any[] = [
    { targetAudience: 'BROADCAST' },
    { targetAudience: 'ALL_ADMINS' },
    { targetAudience: 'STAFF' },
    { targetAdminId: adminId },
  ]

  const notifications = await NotificationModel.find({ isActive: true, $or: or })
    .sort({ createdAt: -1 })
    .limit(200)

  return res.json({ notifications })
}

export async function createNotification(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })

  const body = req.body as any
  const title = String(body.title ?? '').trim()
  const message = String(body.message ?? '').trim()
  const type = String(body.type ?? 'SYSTEM').trim() as NotificationType
  const targetAudience = String(body.targetAudience ?? 'ALL_ADMINS').trim() as NotificationTargetAudience

  if (!title) return res.status(400).json({ message: 'title is required.' })
  if (!message) return res.status(400).json({ message: 'message is required.' })

  const allowedTypes: NotificationType[] = ['SYSTEM', 'PAYMENT', 'LOW_STOCK', 'PRODUCT', 'EMPLOYEE']
  if (!allowedTypes.includes(type)) return res.status(400).json({ message: 'Invalid type.' })

  const allowedAud: NotificationTargetAudience[] = ['STAFF', 'APP_USER', 'ALL_ADMINS', 'ALL_USERS', 'BROADCAST']
  if (!allowedAud.includes(targetAudience)) return res.status(400).json({ message: 'Invalid targetAudience.' })

  const doc = await NotificationModel.create({
    title,
    message,
    type,
    targetAudience,
    targetUserId: body.targetUserId ?? undefined,
    targetAdminId: body.targetAdminId ?? undefined,
    sentByAdminId: req.admin._id,
    isRead: false,
    isActive: true,
  })

  return res.status(201).json({ notification: doc })
}

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })
  const n = await NotificationModel.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true })
  if (!n) return res.status(404).json({ message: 'Notification not found.' })
  return res.json({ notification: n })
}

export async function deleteNotification(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })
  const n = await NotificationModel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!n) return res.status(404).json({ message: 'Notification not found.' })
  return res.json({ message: 'Notification deleted (soft).', notification: n })
}

