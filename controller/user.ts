import express from "express";
import { User } from "../model/user";
import bcrypt from "bcrypt";
import { z } from "zod";

const userRouter = express.Router();

const userSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(["teacher", "student"]),
});

userRouter.get("/", async (_req, res) => {
  const users = await User.find({});
  res.json(users);
});

userRouter.post("/", async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { name, email, password, role } = validatedData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Email already exists" });
    }

    const saltRound = 10;
    const passwordHash = await bcrypt.hash(password, saltRound);
    const user = new User({ name, email, passwordHash, role });
    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request schema" });
    } else {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default userRouter;
