import "dotenv/config";
import express from "express";
import { apiReference } from "@scalar/express-api-reference";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import authRouter from "./endpoint/auth";
import { openApiSpec } from "./docs/openapi";
import { authenticate, authorize } from "./lib/middleware";
import { hashPassword } from "./lib/hash";

const app = express();
const port = process.env.PORT || 3000;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

app.use(express.json());
app.use("/auth", authRouter);

app.get(
  "/docs",
  apiReference({
    content: openApiSpec,
    theme: "kepler",
  })
);

app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.get("/", (_req, res) => {
  res.send("API is running");
});

app.get("/me", authenticate, authorize(["user:read"]), (req, res) => {
  const user = (req as typeof req & { user?: unknown }).user;
  res.status(200).json({ message: "Authorized", user });
});

app.post("/seed/users", async (_req, res) => {
  try {
    const defaultPassword = "12345678";
    const passwordHash = await hashPassword(defaultPassword);

    const users = [
      { nim: "admin", role: "ADMIN" as const },
      { nim: "student", role: "STUDENT" as const },
      { nim: "teacher", role: "TEACHER" as const },
    ];

    const result = await Promise.all(
      users.map(async (user) => {
        const existing = await prisma.user.findUnique({ where: { nim: user.nim } });
        if (existing) {
          return { nim: user.nim, role: user.role, status: "exists" as const };
        }

        await prisma.user.create({
          data: {
            nim: user.nim,
            password: passwordHash,
            role: user.role,
          },
        });

        return { nim: user.nim, role: user.role, status: "created" as const };
      })
    );

    return res.status(200).json({ message: "Seed completed", result });
  } catch (error) {
    return res.status(500).json({ message: "Seed failed", error });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
