import { Request, Response, NextFunction } from "express";

export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    res.status(500).json({ error: "server_error", message: "Admin API key not configured" });
    return;
  }

  const provided =
    req.headers["x-admin-key"] ??
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== adminKey) {
    res.status(401).json({ error: "unauthorized", message: "Valid admin API key required" });
    return;
  }

  next();
}
