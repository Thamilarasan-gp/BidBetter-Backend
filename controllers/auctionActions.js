
const Bid = require('../models/Bid');

// Create a new auction
module.exports.createAuction = async (req, res) => {
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
};

// Get all auctions
module.exports.getAllAuctions = async (req, res) => {
    try {
        const auctions = await Auction.find();
        res.status(200).json(auctions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch auctions' });
    }
};

// Get auction details with bids
module.exports.getAuctionDetails = async (req, res) => {
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
};

// Close an auction
module.exports.closeAuction = async (req, res) => {
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
};
