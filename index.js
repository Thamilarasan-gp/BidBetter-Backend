const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
require('dotenv').config();
const multer = require('multer');
const fs = require('fs');
const Item = require('./models/Item');
const Bid = require('./models/Bid'); 
const Comment = require('./models/Comment'); 
const app = express();
const http = require('http');
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: "bid-better-web-git-master-thamilarasan-gps-projects.vercel.app",
    methods: ["GET", "POST"]
  }
});
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch-all handler for all routes, sending the React app's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.use(bodyParser.json());
app.use(cors());

// app.use('/uploads', express.static('uploads')); // Serve the uploaded images
// Import routes
const bidRoutes = require('./routes/bidRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const imageRoutes = require('./routes/imageRoutes');

// Use routes with /api prefix
app.use('/api/bids', bidRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/images', imageRoutes);
// MongoDB Connection
const mongourl = "mongodb+srv://thamilprakasam2005:appichithamil@cluster0.qqwny.mongodb.net/Bidding";
mongoose.connect(mongourl)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// Create User Schema and Model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  name: String,
  number: String
});
const User = mongoose.model('Users', userSchema);

// OTP Generation & Storage → Generates a 4-digit OTP and stores it temporarily in memory.
// Send OTP via Email → Uses Nodemailer to send OTP to the user's email.
// Verify OTP & Register User → Checks OTP validity, hashes password, and saves the user in MongoDB.
// Login & JWT Token Generation → Validates user credentials and issues a JWT token for authentication.
// JWT Middleware for Protected Routes → Verifies JWT token and grants access to secured endpoints.


// Store OTPs and mock emails in memory
let otpcache = {};

// Function to generate OTP
function generateOTP() {
  return randomstring.generate({ length: 4, charset: 'numeric' });
}

// Function to send OTP email via Gmail
async function sendOTP(email, otp) {
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'OTP Verification',
    text: `Dear User,

Your OTP Code: ${otp}

This OTP is valid for 5 minutes. Please do not share it with anyone.

Best regards,
Your App Team`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending mail:', error);
    throw error;
  }
}

// Request OTP route
app.post('/reqOTP', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Received OTP request for email: ${email}`);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const otp = generateOTP();
    otpcache[email] = { otp,timestamp: Date.now()};

    await sendOTP(email, otp);
    res.status(200).json({ message: 'OTP Sent Successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      message: 'Failed to send OTP. Please try again.',
      error: error.message
    });
  }
});

// Verify OTP route
app.post('/verifyOTP', async (req, res) => {
  try {
    const { email, otp, username, password, name, number } = req.body;
    console.log(`Verifying OTP for email: ${email}`);

    if (!otpcache[email]) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    const storedOTP = otpcache[email];
    const otptime = Date.now() - storedOTP.timestamp;
    const OTP_ex = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (otptime > OTP_ex) {
      delete otpcache[email];
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (storedOTP.otp === otp.trim()) {
      delete otpcache[email];

      // Check if username is taken
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Hash password and save new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username,email,password: hashedPassword,name,number});
      await newUser.save();

      return res.status(200).json({ message: 'Registration successful!' });
    } else {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
{ userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({ message: "Login successful",token,userId: user._id,username: user.username});
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// Middleware to verify JWT token
const Aunthenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Protected route to get user profile
app.get('/api/users/profile/:userId', Aunthenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get items by username
app.get('/api/myproducts', Aunthenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const items = await Item.find({ sellerName: username });
    res.json(items);
  } catch (error) {
    console.error('Error fetching user items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get username from token
app.get('/api/user', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.json({
      username: decoded.username,
      userId: decoded.userId,
      avatar: `https://randomuser.me/api/portraits/lego/${Math.floor(Math.random() * 8) + 1}.jpg`
    });
  });
});

// Get comments for an item
app.get('/items/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ itemId: req.params.id })
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment to an item
app.post('/items/:id/comments', async (req, res) => {
  try {
    const { userId, username, content, userAvatar } = req.body;
    const itemId = req.params.id;

    const comment = new Comment({
      itemId,
      userId,
      username,
      content,
      userAvatar
    });

    await comment.save();

    // Emit the new comment to all clients in the item room
    io.to(`item_${itemId}`).emit('new_comment', {
      ...comment.toJSON(),
      timeAgo: comment.timeAgo
    });

    res.json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Join a bid for an item
  socket.on('join_item', (itemId) => {
    socket.join(`item_${itemId}`);
    console.log(`User joined room for item ${itemId}`);
  });

  // Leave a bid for product
  socket.on('leave_item', (itemId) => {
    socket.leave(`item_${itemId}`);
    console.log(`User left room for item ${itemId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Get bid history for an item
app.get('/items/:id/bids', async (req, res) => {
  try {
    const bids = await Bid.find({ itemId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(bids);
  } catch (error) {
    console.error('Error fetching bid history:', error);
    res.status(500).json({ error: 'Failed to fetch bid history' });
  }
});

// Place a new bid
app.post('/items/:id/bid', async (req, res) => {
  try {
    const { bidder, bidAmount, bidderAvatar } = req.body;
    const itemId = req.params.id;

    // Get the item to check current highest bid
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get the current highest bid
    const highestBid = await Bid.findOne({ itemId })
      .sort({ bidAmount: -1 });

    const minBid = highestBid ? highestBid.bidAmount + 1 : item.startingBid;

    if (bidAmount < minBid) {
      return res.status(400).json({
        error: `Bid must be at least $${minBid}`
      });
    }

    // Create the new bid
    const newBid = new Bid({
      itemId,
      bidder,
      bidAmount,
      bidderAvatar
    });

    await newBid.save();

    // Emit the new bid to all clients in the item room
    io.to(`item_${itemId}`).emit('new_bid', {
      ...newBid.toJSON(),
      timeAgo: newBid.timeAgo
    });

    res.json(newBid);
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Get latest image
app.get('/api/image/latest', async (req, res) => {
  try {
    const image = await Image.findOne().sort({ uploadedAt: -1 });
    res.json(image);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching image', error: error.message });
  }
});

// Delete image
app.delete('/api/image/:id', async (req, res) => {
  try {
    await Image.findByIdAndDelete(req.params.id);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

// Item Upload Route
app.post('/items',Aunthenticate, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'thumbnails', maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      itemName,
      description,
      startingBid,
      endTime,
      sportsCategory,
      deliveryMethod
    } = req.body;

    // Get username from authenticated user
    const username = req.user.username;

    const newItem = new Item({
      itemName,
      description,
      startingBid,
      endTime,
      sellerName: username, // Use authenticated username
      sportsCategory,
      deliveryMethod
    });

    // Handle main image
    if (req.files['mainImage']) {
      const mainImageFile = req.files['mainImage'][0];
      newItem.mainImage = {
        filename: mainImageFile.originalname,
        contentType: mainImageFile.mimetype,
        imageData: mainImageFile.buffer
      };
    }

    // Handle thumbnails
    if (req.files['thumbnails']) {
      newItem.thumbnails = req.files['thumbnails'].map(file => ({
        filename: file.originalname,
        contentType: file.mimetype,
        imageData: file.buffer
      }));
    }

    await newItem.save();
    res.status(201).json({ message: 'Item created successfully', item: newItem });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Error creating item' });
  }
});

// Route to get all items
app.get('/items', async (req, res) => {
  console.log('GET /items endpoint hit');
  try {
    const items = await Item.find()
      .sort({ endTime: 1 })
      .limit(20);

    console.log('Items found in database:', items.length);
    console.log('Sample item structure:', items[0] ? {
      id: items[0]._id,
      itemName: items[0].itemName,
      startingBid: items[0].startingBid,
      hasImage: !!items[0].mainImage,
      fields: Object.keys(items[0]._doc)
    } : 'No items found');

    res.json(items);
  } catch (error) {
    console.error('Database error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item details
app.get('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item details' });
  }
});

// Default Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});

