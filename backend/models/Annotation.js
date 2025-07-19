// const mongoose = require('mongoose');

// const AnnotationSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   pdfId: { type: mongoose.Schema.Types.ObjectId, ref: 'PDF', required: true },
//   annotationData: { type: Object, required: true }, // JSON data for annotations
//   updatedAt: { type: Date, default: Date.now }
// });

// AnnotationSchema.index({ userId: 1, pdfId: 1 }, { unique: true });

// module.exports = mongoose.model('Annotation', AnnotationSchema);
