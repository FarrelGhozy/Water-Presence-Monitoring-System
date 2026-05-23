import { model, Schema } from 'mongoose'
import type { ObservationStatus } from '../types'

const ObservationSchema = new Schema({
  photoUrl: { type: String, default: null },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  province: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending',
  },
})

ObservationSchema.index({ latitude: 1, longitude: 1 })
ObservationSchema.index({ status: 1 })
ObservationSchema.index({ timestamp: -1 })

export const Observation = model('Observation', ObservationSchema)
