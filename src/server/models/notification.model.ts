import mongoose, { type InferSchemaType, type Model } from 'mongoose'

export type NotificationType = 'SYSTEM' | 'PAYMENT' | 'LOW_STOCK' | 'PRODUCT' | 'EMPLOYEE'
export type NotificationTargetAudience =
  | 'STAFF'
  | 'APP_USER'
  | 'ALL_ADMINS'
  | 'ALL_USERS'
  | 'BROADCAST'

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['SYSTEM', 'PAYMENT', 'LOW_STOCK', 'PRODUCT', 'EMPLOYEE'],
      default: 'SYSTEM',
      index: true,
    },
    targetAudience: {
      type: String,
      required: true,
      enum: ['STAFF', 'APP_USER', 'ALL_ADMINS', 'ALL_USERS', 'BROADCAST'],
      default: 'ALL_ADMINS',
      index: true,
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    targetAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false, index: true },
    sentByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false },
    isRead: { type: Boolean, required: true, default: false, index: true },
    isActive: { type: Boolean, required: true, default: true, index: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
)

export type Notification = InferSchemaType<typeof notificationSchema>
export type NotificationDocument = mongoose.HydratedDocument<Notification>

export const NotificationModel: Model<Notification> =
  (mongoose.models.Notification as Model<Notification>) ||
  mongoose.model<Notification>('Notification', notificationSchema)

