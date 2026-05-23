import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { config } from '../config'

export async function savePhoto(buffer: Buffer): Promise<string> {
  const filename = `${randomUUID()}.jpg`
  const dir = join(process.cwd(), config.storagePath)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)
  return `/uploads/${filename}`
}
