const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    itemName: String,
    description: String,
    startingBid: Number,
    endTime: Date,
    sellerName: String,
    sportsCategory: String,
    deliveryMethod: {
      type: String,
      enum: ['Shipping', 'Pickup', 'Courier'],  // Ensure these values match
      required: true
    },
    mainImage: {
        filename: String,
        contentType: String,
        imageData: Buffer,
    },
    thumbnails: [{
        filename: String,
        contentType: String,
        imageData: Buffer,
    }]
  });
  

const Item = mongoose.model('Item', ItemSchema);

module.exports = Item;
