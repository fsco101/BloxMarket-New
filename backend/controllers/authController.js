import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Dynamically read from environment at runtime to ensure correct value
const getJwtConfig = () => ({
  secret: process.env.JWT_SECRET?.trim() || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '30d'
});

export const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const { username, email, password, robloxUsername } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: { $regex: new RegExp(`^${username}$`, 'i') } }
        ]
      });

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        if (existingUser.username.toLowerCase() === username.toLowerCase()) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = new User({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        roblox_username: robloxUsername?.trim() || null,
        role: 'user',
        is_active: true,
        credibility_score: 0
      });

      await user.save();

      // Generate JWT token
      const { secret, expiresIn } = getJwtConfig();
      console.log(`Generating JWT token with expiration: ${expiresIn}`);
      const token = jwt.sign(
        { 
          userId: user._id.toString(),
          username: user.username,
          role: user.role 
        },
        secret,
        { expiresIn }
      );

      // Add token to user's tokens array
      user.tokens.push({ token });
      await user.save();

      // Return user data and token
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          roblox_username: user.roblox_username,
          avatar_url: user.avatar_url,
          credibility_score: user.credibility_score,
          is_verified: user.is_verified,
          is_middleman: user.is_middleman,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ 
          error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
        });
      }
      
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Find user by username or email
      const user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${username}$`, 'i') } },
          { email: username.toLowerCase() }
        ]
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is banned
      if (user.role === 'banned') {
        return res.status(403).json({ 
          error: `Your account has been banned. Reason: ${user.ban_reason || 'No reason provided'}` 
        });
      }

      // Check if account is deactivated
      if (!user.is_active) {
        return res.status(403).json({ 
          error: `Your account has been deactivated. Reason: ${user.deactivation_reason || 'No reason provided'}` 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const { secret, expiresIn } = getJwtConfig();
      console.log(`Generating JWT token with expiration: ${expiresIn}`);
      const token = jwt.sign(
        { 
          id: user._id.toString(),           // Add this
          userId: user._id.toString(),       // Keep this for backward compatibility
          _id: user._id.toString(),          // Add this too
          username: user.username,
          email: user.email,
          role: user.role 
        },
        secret,
        { expiresIn }
      );

      // Add token to user's tokens array
      user.tokens.push({ token });
      user.lastLogin = new Date();
      await user.save();

      // Return user data and token
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          roblox_username: user.roblox_username,
          avatar_url: user.avatar_url,
          credibility_score: user.credibility_score,
          is_verified: user.is_verified,
          is_middleman: user.is_middleman,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  // Logout user (remove current token)
  logout: async (req, res) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const user = await User.findById(req.user.userId);

      if (user && token) {
        user.tokens = user.tokens.filter(t => t.token !== token);
        await user.save();
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  // Logout from all devices
  logoutAll: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (user) {
        user.tokens = [];
        await user.save();
      }

      res.json({ message: 'Logged out from all devices successfully' });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({ error: 'Logout all failed' });
    }
  },

  // Get current user (for token verification)
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select('-password_hash -tokens');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        roblox_username: user.roblox_username,
        avatar_url: user.avatar_url,
        bio: user.bio,
        discord_username: user.discord_username,
        credibility_score: user.credibility_score,
        is_verified: user.is_verified,
        is_middleman: user.is_middleman,
        verification_requested: user.verification_requested,
        middleman_requested: user.middleman_requested,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  }
};