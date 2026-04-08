import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true },
  fileUrl:      { type: String, required: true },
  fileKey:      { type: String, required: true },
  fileSize:     { type: Number },
  pageCount:    { type: Number },
  status:       { type: String, enum: ['pending','processing','ready','error'], default: 'pending' },
  errorMessage: { type: String },
  progress:     { type: Number, default: 0 },   // 0-100 percentage
  progressMsg:  { type: String, default: '' },  // human readable step
}, { timestamps: true })

documentSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('Document', documentSchema)