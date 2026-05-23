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
  recommendations: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
})

export const GeminiAnalysis = model('GeminiAnalysis', GeminiAnalysisSchema)
