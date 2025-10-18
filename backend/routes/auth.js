import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, robloxUsername } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username,
      email,
      password_hash,
      role: 'user',
      roblox_username: robloxUsername || null
    });

    await user.save();

    // Generate JWT token
    const secret = (process.env.JWT_SECRET || 'your-secret-key').trim();
    const expiresIn = ((process.env.JWT_EXPIRES_IN || '30d') + '').replace(/['"]/g, '').trim();

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      secret,
      { expiresIn }
    );

    // Ensure tokens array exists, push, and keep last 5
    user.tokens = user.tokens || [];
    user.tokens.push({ token });
    if (user.tokens.length > 5) user.tokens = user.tokens.slice(-5);
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        is_middleman: user.is_middleman,
        credibility_score: user.credibility_score,
        roblox_username: user.roblox_username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    // Handle both username and email fields
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { username: loginIdentifier }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is banned
    if (user.role === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const secret = (process.env.JWT_SECRET || 'your-secret-key').trim();
    const expiresIn = ((process.env.JWT_EXPIRES_IN || '30d') + '').replace(/['"]/g, '').trim();

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      secret,
      { expiresIn }
    );

    // Ensure tokens array exists, push, and keep last 5
    user.tokens = user.tokens || [];
    user.tokens.push({ token });
    if (user.tokens.length > 5) user.tokens = user.tokens.slice(-5);
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        is_middleman: user.is_middleman,
        credibility_score: user.credibility_score,
        roblox_username: user.roblox_username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user route
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password_hash -tokens');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      is_middleman: user.is_middleman,
      credibility_score: user.credibility_score,
      roblox_username: user.roblox_username,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user) {
      // Remove the current token from the user's tokens array
      user.tokens = user.tokens.filter(tokenObj => tokenObj.token !== req.token);
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;