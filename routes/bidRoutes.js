const express = require('express');
const router = express.Router();
const bidActions = require('../controllers/bidActions');

// Place a bid
router.post('/bid', bidActions.placeBid);

module.exports = router;
