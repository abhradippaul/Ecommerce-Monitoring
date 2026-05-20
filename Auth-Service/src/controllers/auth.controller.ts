import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema, updateUserSchema } from '../schemas/user.schema.js';
import logger from '../logger/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';
import type { AuthenticatedRequest } from '../utils/types.js';

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const existingUser = await authService.findByEmailOrUsername(validatedData.email, validatedData.username);

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
        error: "A user with this email or username already exists"
      });
    }

    const user = await authService.register(validatedData);

    if (!user?._id) {
      return res.status(500).json({
        message: "Registration failed",
        error: "Failed to register user"
      });
    }

    logger.info(`User registered: ${user.username}`);
    return res.status(201).json({
      message: "Successfully registered user",
      data: user
    });
  } catch (error: any) {
    logger.error(`Registration error: ${error.message}`);
    return res.status(400).json({
      message: "Registration failed",
      error: error.message
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authService.findByEmail(email);

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: "Login failed",
        error: "Invalid credentials"
      });
    }

    const userDetails = {
      id: user._id,
      role: user.role
    }
    const access_token = generateAccessToken(userDetails);
    const refresh_token = generateRefreshToken(userDetails);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User logged in: ${user.username}`);
    return res.status(200).json({
      message: "Login successful",
      data: {
        access_token,
        refresh_token
      }
    });
  } catch (error: any) {
    logger.error(`Login error: ${error.message}`);
    return res.status(400).json({
      message: "Login error",
      error: error.message
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  logger.info('User logged out');
  return res.status(200).json({
    message: "Logged out successfully"
  });
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Update failed",
        error: "ID is required"
      });
    }

    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      return res.status(401).json({
        message: "Update failed",
        error: "Unauthorized: Missing authentication context"
      });
    }

    if (authUser.role !== 'admin' && authUser.userId !== id) {
      return res.status(403).json({
        message: "Update failed",
        error: "Forbidden: You can only update your own account"
      });
    }

    const validatedData = updateUserSchema.parse(req.body);

    const user = await authService.update(id as string, validatedData);
    if (!user) {
      return res.status(404).json({
        message: "Update failed",
        error: "User not found"
      });
    }

    logger.info(`User updated: ${user.username}`);
    return res.status(200).json({
      message: "User updated successfully",
      data: user
    });
  } catch (error: any) {
    logger.error(`Update error: ${error.message}`);
    return res.status(400).json({
      message: "Update failed",
      error: error.message
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Delete failed",
        error: "ID is required"
      });
    }

    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      return res.status(401).json({
        message: "Delete failed",
        error: "Unauthorized: Missing authentication context"
      });
    }

    if (authUser.role !== 'admin' && authUser.userId !== id) {
      return res.status(403).json({
        message: "Delete failed",
        error: "Forbidden: You can only delete your own account"
      });
    }

    const deleted = await authService.delete(id as string);
    if (!deleted) {
      return res.status(404).json({
        message: "Delete failed",
        error: "User not found"
      });
    }
    logger.info(`User deleted: ${id}`);
    return res.status(200).json({
      message: "User deleted successfully"
    });
  } catch (error: any) {
    logger.error(`Delete error: ${error.message}`);
    return res.status(400).json({
      message: "Delete failed",
      error: error.message
    });
  }
};
