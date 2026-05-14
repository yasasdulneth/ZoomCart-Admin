import type { Request, Response } from 'express'
import { PaymentModel } from '../models/payment.model.ts'

export async function listPayments(_req: Request, res: Response) {
  const payments = await PaymentModel.find().sort({ createdAt: -1 })
  return res.json({ payments })
}

export async function getPaymentById(req: Request, res: Response) {
  const payment = await PaymentModel.findById(req.params.id)
  if (!payment) return res.status(404).json({ message: 'Payment not found.' })
  return res.json({ payment })
}

export async function verifyPayment(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized.' })

  const payment = await PaymentModel.findById(req.params.id)
  if (!payment) return res.status(404).json({ message: 'Payment not found.' })

  if (payment.status === 'VERIFIED') {
    return res.json({ payment, message: 'Payment already verified.' })
  }

  payment.status = 'VERIFIED'
  ;(payment as any).verifiedBy = req.admin._id
  ;(payment as any).verifiedAt = new Date()
  await payment.save()

  return res.json({ payment })
}

export async function deletePayment(req: Request, res: Response) {
  try {
    const payment = await PaymentModel.findByIdAndDelete(req.params.id)
    if (!payment) return res.status(404).json({ message: 'Payment not found.' })
    return res.json({ message: 'Payment deleted.' })
  } catch {
    return res.status(500).json({ message: 'Failed to delete payment.' })
  }
}

