import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    barcode: { type: String, required: true, trim: true, unique: true, index: true },

    originalPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100, default: 0 },
    discountedPrice: { type: Number, required: true, min: 0 },
    hasDiscount: { type: Boolean, required: true, default: false },

    category: { type: String, required: true, trim: true, default: 'General' },
    aisle: { type: String, required: true, trim: true, default: '' },
    shelfSection: { type: String, required: true, trim: true, default: '' },

    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 10 },

    nutritionInfo: { type: String, required: true, trim: true, default: '' },
    cheaperAlternativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    imageUrl: { type: String, required: false, trim: true },

    isActive: { type: Boolean, required: true, default: true, index: true },
    isComplete: { type: Boolean, required: true, default: true },
    salesCount: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
)

productSchema.index({ name: 'text', category: 'text' })

export type Product = InferSchemaType<typeof productSchema> & {
  cheaperAlternativeId?: Types.ObjectId
}
export type ProductDocument = mongoose.HydratedDocument<Product>

export const ProductModel: Model<Product> =
  (mongoose.models.Product as Model<Product>) || mongoose.model<Product>('Product', productSchema)

