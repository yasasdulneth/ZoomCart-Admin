import mongoose, { type InferSchemaType, type Model } from 'mongoose'

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED'

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: false },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['PENDING', 'VERIFIED', 'EXPIRED'], default: 'PENDING' },

    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false },
    verifiedAt: { type: Date, required: false },

    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
)

export type Payment = InferSchemaType<typeof paymentSchema>
export type PaymentDocument = mongoose.HydratedDocument<Payment>

export const PaymentModel: Model<Payment> =
  (mongoose.models.Payment as Model<Payment>) || mongoose.model<Payment>('Payment', paymentSchema)

