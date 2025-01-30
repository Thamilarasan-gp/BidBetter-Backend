const Bid = require('../models/Bid');


// Place a bid
module.exports.placeBid = async (req, res) => {
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
};
