// src/interfaces/http/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { logger } from "@/infrastructure/logger/logger"

const db = require("../../../config/db")

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {
    const header = req.headers.authorization

    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token não fornecido" })
      return
    }

    const token = header.split(" ")[1]
    const secret = process.env.JWT_SECRET

    if (!secret) {
      res.status(500).json({ error: "JWT_SECRET não configurada" })
      return
    }

    const decoded = jwt.verify(token, secret) as any

    // Buscar usuário atualizado no banco
    const result = await db.query(
      `SELECT id, email, dealership_id, role, name
       FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    )

    if (!result.rows[0]) {
      res.status(401).json({ error: "Usuário não encontrado" })
      return
    }

    ;(req as any).user = result.rows[0]

    next()

  } catch (err: any) {
    logger.warn(`⚠️ Auth falhou: ${err.message}`)
    res.status(401).json({ error: "Token inválido ou expirado" })
  }
}
