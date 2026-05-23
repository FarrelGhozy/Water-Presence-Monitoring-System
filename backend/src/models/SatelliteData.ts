import { model, Schema } from 'mongoose'

const SatelliteDataSchema = new Schema({
  observationId: { type: Schema.Types.ObjectId, ref: 'Observation', required: true, unique: true },
  sar: {
    waterPercentage: { type: Number, default: null },
    backscatterMean: { type: Number, default: null },
    confidence: { type: String, enum: ['high', 'low', 'no_data'], default: 'no_data' },
  },
  ndwi: {
    value: { type: Number, default: null },
    available: { type: Boolean, default: false },
    cloudCover: { type: Number, default: null },
  },
  chirps: {
    rainfall7day_mm: { type: Number, default: 0 },
    trend: { type: String, default: 'stable' },
  },
  soil: {
    type: { type: String, default: 'unknown' },
  },
  elevation: {
    meters: { type: Number, default: 0 },
    terrain: { type: String, default: 'flat' },
  },
})

export const SatelliteData = model('SatelliteData', SatelliteDataSchema)
