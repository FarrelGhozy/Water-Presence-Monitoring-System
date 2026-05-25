import { model, Schema } from 'mongoose'
import type { Verdict } from '../types'

const GeminiAnalysisSchema = new Schema({
  observationId: { type: Schema.Types.ObjectId, ref: 'Observation', required: true, unique: true },
  confidence: { type: Number, required: true },
  verdict: {
    type: String,
    enum: ['definitive', 'probable', 'possible', 'unlikely'],
    required: true,
  },
  reasoning: { type: String, required: true },
  contributingFactors: [{ type: String }],
  anomalies: [{ type: String }],
  recommendations: [{ type: String }],
  processedAt: { type: Date },
  processingTimeMs: { type: Number },
  createdAt: { type: Date, default: Date.now },
})

export const GeminiAnalysis = model('GeminiAnalysis', GeminiAnalysisSchema)
