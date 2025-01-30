const express = require('express');
const router = express.Router();
const Image = require('../models/ImageModel');

router.post('/upload', async (req, res) => {
  try {
    const { 
      mainImage, 
      itemName, 
      description, 
      startingBid, 
      endTime, 
      sellerName, 
      categories 
    } = req.body;

    console.log('Received upload request with payload:', req.body);

    // Validate required fields
    if (!mainImage || !itemName || !startingBid || !endTime) {
      console.error('Missing required fields', {
        mainImage: !!mainImage,
        itemName: !!itemName,
        startingBid: !!startingBid,
        endTime: !!endTime
      });
      return res.status(400).json({ 
        message: 'Missing required fields', 
        requiredFields: ['mainImage', 'itemName', 'startingBid', 'endTime'] 
      });
    }

    try {
      const newImage = new Image({
        name: mainImage.name || 'Unnamed Image',
        data: mainImage.data,
        contentType: mainImage.contentType || 'application/octet-stream',
        itemName,
        description: description || '',
        startingBid: parseFloat(startingBid),
        endTime: new Date(endTime),
        sellerName: sellerName || 'Anonymous',
        categories: categories || []
      });

      const savedImage = await newImage.save();
      console.log('Image saved successfully:', savedImage._id);
      res.status(201).json(savedImage);
    } catch (saveError) {
      console.error('Error saving image to database:', saveError);
      res.status(500).json({ 
        message: 'Error saving image', 
        error: saveError.message,
        details: saveError.errors ? Object.keys(saveError.errors) : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Unexpected error in image upload:', error);
    res.status(500).json({ 
      message: 'Something went wrong!', 
      error: error.message 
    });
  }
});

module.exports = router;