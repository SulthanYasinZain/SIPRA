import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type Resource = "user" | "admin" | "attendance" | "class" | "session";
export type Action = "read" | "write" | "delete";
export type Permission = `${Resource}:${Action}`;

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export const rolePermissions: Record<Role, Permission[]> = {
  STUDENT: ["user:read", "attendance:read", "attendance:write", "class:read", "session:read"],
  TEACHER: [
    "user:read",
    "attendance:read",
    "attendance:write",
    "class:read",
    "class:write",
    "session:read",
    "session:write",
  ],
  ADMIN: [
    "user:read",
    "user:write",
    "user:delete",
    "admin:read",
    "admin:write",
    "attendance:read",
    "attendance:write",
    "attendance:delete",
    "class:read",
    "class:write",
    "class:delete",
    "session:read",
    "session:write",
    "session:delete",
  ],
};

export type AuthTokenPayload = {
  user_id: string;
  nim: string;
  role: Role;
  permissions: Permission[];
  iat?: number;
  exp?: number;
};

type AuthenticatedRequest = Request & { user?: AuthTokenPayload };

const SECRET_KEY = process.env.JWT_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is not set in environment variables");
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET_KEY) as AuthTokenPayload;
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(required: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const hasAllPermissions = required.every((permission) => user.permissions.includes(permission));
    if (!hasAllPermissions) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
}
