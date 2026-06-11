import { model, Schema } from 'mongoose'

const RegionalIndexSchema = new Schema({
  province: { type: String, required: true, unique: true },
  waterIndex: { type: Number, default: 0 },
  observationCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  historicalTrend: [{
    date: { type: Date },
    waterIndex: { type: Number },
  }],
})

RegionalIndexSchema.index({ province: 1 })

export const RegionalIndex = model('RegionalIndex', RegionalIndexSchema)
