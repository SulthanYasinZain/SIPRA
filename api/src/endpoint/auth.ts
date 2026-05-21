import { Router } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, verifyPassword } from "../lib/hash";
import { rolePermissions, type Role } from "../lib/middleware";

const router = Router();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is not set in environment variables");
}

router.post("/register", async (req, res) => {
  try {
    const { nim, password, role } = req.body as {
      nim?: string;
      password?: string;
      role?: Role;
    };

    if (!nim || !password || !role) {
      return res.status(400).json({ message: "nim, password, and role are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { nim } });
    if (existingUser) {
      return res.status(409).json({ message: "NIM already registered" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        nim,
        password: passwordHash,
        role,
      },
      select: {
        user_id: true,
        nim: true,
        role: true,
      },
    });

    const permissions = rolePermissions[user.role as Role] ?? [];
    const token = jwt.sign({ user_id: user.user_id, nim: user.nim, role: user.role, permissions }, SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.status(201).json({ message: "Register successful", token, user, permissions });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { nim, password } = req.body as { nim?: string; password?: string };

    if (!nim || !password) {
      return res.status(400).json({ message: "nim and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { nim } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const permissions = rolePermissions[user.role as Role] ?? [];
    const token = jwt.sign({ user_id: user.user_id, nim: user.nim, role: user.role, permissions }, SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        nim: user.nim,
        role: user.role,
      },
      permissions,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error });
  }
});

export default router;
