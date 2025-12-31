import express from "express";
import { userExtractor } from "../utils/middleware";
import { Request, Response } from "express";
import { User } from "../model/user";

const meRouter = express.Router();

meRouter.get("/", userExtractor, async (req: Request, res: Response) => {
  const user = req.user;
  const me = await User.findById(user.id);
  return res.json({
    success: true,
    data: {
      id: me!.id,
      name: me!.name,
      email: me!.email,
      role: me!.role,
    },
  });
});

export default meRouter
