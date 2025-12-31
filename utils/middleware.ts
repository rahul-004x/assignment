import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../model/user";

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

type DecodedToken = {
  id: string;
  name: string;
};

const getTokenFrom = (req: Request) => {
  const authorization = req.get("Authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "");
  }
  return null;
};

const userExtractor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = getTokenFrom(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Sign up to use this route",
    });
  }
  try {
    const decodedToken = jwt.verify(token, process.env.SECRET!) as DecodedToken;
    if (!decodedToken.id) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }
    const user = await User.findById(decodedToken.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
  return null;
};

export { getTokenFrom, userExtractor };
