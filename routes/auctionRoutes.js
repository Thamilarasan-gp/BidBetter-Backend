const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

// Create a new auction
router.post('/create', async (req, res) => {
    try {
        const { itemName, description, startingBid, endTime, seller } = req.body;

        const auction = new Auction({
            itemName,
            description,
            startingBid,
            currentBid: startingBid,
            endTime,
            seller,
        });

        const savedAuction = await auction.save();
        res.status(201).json(savedAuction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all auctions
router.get('/', async (req, res) => {
    try {
        const auctions = await Auction.find();
        res.status(200).json(auctions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch auctions' });
    }
});

// Place a bid
router.post('/bid', async (req, res) => {
    try {
        const { auctionId, bidder, bidAmount } = req.body;

        // Find the auction
        const auction = await Auction.findById(auctionId);

        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        if (new Date() > new Date(auction.endTime)) {
            return res.status(400).json({ error: 'Auction has already ended' });
        }

        if (bidAmount <= auction.currentBid) {
            return res.status(400).json({ error: 'Bid must be higher than current bid' });
        }

        // Update auction's current bid
        auction.currentBid = bidAmount;
        await auction.save();

        // Save the bid
        const bid = new Bid({ auctionId, bidder, bidAmount });
        const savedBid = await bid.save();

        res.status(200).json({ message: 'Bid placed successfully', bid: savedBid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to place bid' });
    }
});

// Get auction details with bids
router.get('/:id', async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id);
        const bids = await Bid.find({ auctionId: req.params.id }).sort('-bidAmount');

        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        res.status(200).json({ auction, bids });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch auction details' });
    }
});

// Close an auction
router.put('/:id/close', async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id);

        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        if (auction.status === 'closed') {
            return res.status(400).json({ error: 'Auction is already closed' });
        }

        auction.status = 'closed';
        await auction.save();

        res.status(200).json({ message: 'Auction closed successfully', auction });
    } catch (err) {
        res.status(500).json({ error: 'Failed to close auction' });
    }
});



module.exports = router;
