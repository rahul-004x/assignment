import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../model/user";

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

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
    const { id } = jwt.verify(token, process.env.SECRET!) as JwtPayload;
    if (!id) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }
    const user = await User.findById(id);
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
