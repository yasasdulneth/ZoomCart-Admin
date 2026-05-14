import dotenv from 'dotenv'

// Loads `.env` from the project root by default.
dotenv.config()

function required(name: string): string {
  const v = process.env[name]
  if (!v || !v.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required('MONGO_URI'),
  mongoUriFallback: process.env.MONGO_URI_FALLBACK?.trim() || undefined,
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

