export function computeDiscount(params: {
  originalPrice: number
  discountPercentage?: number
  discountedPrice?: number
}): { originalPrice: number; discountPercentage: number; discountedPrice: number; hasDiscount: boolean } {
  const originalPrice = params.originalPrice
  if (Number.isNaN(originalPrice) || originalPrice < 0) {
    throw new Error('originalPrice must be a non-negative number.')
  }

  const discountedPriceRaw = params.discountedPrice
  if (typeof discountedPriceRaw === 'number' && !Number.isNaN(discountedPriceRaw)) {
    const discountedPrice = Math.round(discountedPriceRaw * 100) / 100
    const pct = originalPrice > 0 ? ((originalPrice - discountedPrice) / originalPrice) * 100 : 0
    const discountPercentage = Math.round(pct * 100) / 100
    const hasDiscount = discountPercentage > 0 && discountedPrice < originalPrice
    return {
      originalPrice,
      discountPercentage: hasDiscount ? discountPercentage : 0,
      discountedPrice: hasDiscount ? discountedPrice : originalPrice,
      hasDiscount,
    }
  }

  const pctRaw = params.discountPercentage ?? 0
  if (Number.isNaN(pctRaw) || pctRaw < 0 || pctRaw > 100) {
    throw new Error('discountPercentage must be between 0 and 100.')
  }
  const discounted = Math.round((originalPrice - (originalPrice * pctRaw) / 100) * 100) / 100
  const hasDiscount = pctRaw > 0 && discounted < originalPrice
  return {
    originalPrice,
    discountPercentage: hasDiscount ? Math.round(pctRaw * 100) / 100 : 0,
    discountedPrice: hasDiscount ? discounted : originalPrice,
    hasDiscount,
  }
}

