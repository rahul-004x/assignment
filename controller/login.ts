import express from "express";
import { z } from "zod";
import { User } from "../model/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const loginRouter = express.Router();

loginRouter.post("/", async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const { email, password } = validatedData;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password",
    });
  }
  const correctPassword = await bcrypt.compare(password, user.passwordHash!);
  if (!correctPassword) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password",
    });
  }

  const userForToken = {
    id: user._id,
    role: user.role,
  };

  const token = jwt.sign(userForToken, process.env.SECRET!);

  return res.status(200).json({
    success: true,
    data: {
      token: token,
    },
  });
});

export default loginRouter;
