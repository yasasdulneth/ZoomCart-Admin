import mongoose from 'mongoose'
import { env } from './env.ts'

let connected = false

async function tryConnect(uri: string, label: string): Promise<void> {
  const opts = {
    autoIndex: env.nodeEnv !== 'production',
    serverSelectionTimeoutMS: 15_000,
  } as const
  console.log(`[MongoDB] Connecting via ${label}…`)
  await mongoose.connect(uri, opts)
}

export async function connectMongo(): Promise<typeof mongoose> {
  if (connected) return mongoose

  mongoose.set('strictQuery', true)

  let attempt = 0

  while (true) {
    attempt++
    try {
      await tryConnect(env.mongoUri, 'SRV URI')
      connected = true
      console.log('[MongoDB] Connected via SRV URI')
      return mongoose
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      const isSrvDnsFailure =
        err?.code === 'ECONNREFUSED' && msg.includes('_mongodb._tcp') && msg.includes('querySrv')

      if (isSrvDnsFailure && env.mongoUriFallback) {
        try {
          await tryConnect(env.mongoUriFallback, 'standard URI fallback')
          connected = true
          console.log('[MongoDB] Connected via standard URI fallback')
          return mongoose
        } catch { /* fall through to retry */ }
      }

      const delay = Math.min(attempt * 5_000, 30_000)
      console.warn(`[MongoDB] Connection attempt ${attempt} failed — retrying in ${delay / 1000}s… (whitelist ${await getPublicIp()} in Atlas if stuck)`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

async function getPublicIp(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org')
    return await r.text()
  } catch {
    return 'your IP'
  }
}

