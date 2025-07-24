// const express = require('express');
// const router = express.Router();
// const Annotation = require('../models/Annotation');
// const { ensureAuthenticated } = require('../middleware/auth');

// // Get annotations for a user and PDF
// router.get('/:pdfId', ensureAuthenticated, async (req, res) => {
//   try {
//     const annotation = await Annotation.findOne({
//       userId: req.user._id,
//       pdfId: req.params.pdfId
//     });
//     res.json(annotation ? annotation.annotationData : null);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // Save or update annotations for a user and PDF
// router.post('/:pdfId', ensureAuthenticated, async (req, res) => {
//   try {
//     const { annotationData } = req.body;
//     const annotation = await Annotation.findOneAndUpdate(
//       { userId: req.user._id, pdfId: req.params.pdfId },
//       { annotationData, updatedAt: Date.now() },
//       { upsert: true, new: true }
//     );
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// module.exports = router;
