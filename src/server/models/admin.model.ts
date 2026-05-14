import mongoose, { type InferSchemaType, type Model } from 'mongoose'

export type AdminRole = 'SUPER_ADMIN' | 'STAFF'

const adminSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ['SUPER_ADMIN', 'STAFF'], default: 'STAFF' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

adminSchema.set('toJSON', {
  transform(_doc, ret) {
    // passwordHash is select:false, but ensure it never leaks
    ;(ret as any).passwordHash = undefined
    return ret
  },
})

export type Admin = InferSchemaType<typeof adminSchema>
export type AdminDocument = mongoose.HydratedDocument<Admin>

export const AdminModel: Model<Admin> =
  (mongoose.models.Admin as Model<Admin>) || mongoose.model<Admin>('Admin', adminSchema)

