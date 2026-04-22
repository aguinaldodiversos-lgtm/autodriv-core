// src/shared/types/express.d.ts
// Extensão do tipo Request do Express para incluir o usuário autenticado

import "express"

declare global {
  namespace Express {
    interface Request {
      user?: {
        id:             string
        email:          string
        name:           string
        dealership_id:  string
        role:           "admin" | "manager" | "seller" | "maintenance"
      }
    }
  }
}
