const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  name: String,
  data: String,
  contentType: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Image', imageSchema);