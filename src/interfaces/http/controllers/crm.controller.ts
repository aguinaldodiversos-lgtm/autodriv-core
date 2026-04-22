// src/interfaces/http/controllers/crm.controller.ts
// CRM — gestão de clientes e relacionamento

import { Request, Response } from "express"
import { DatabaseClient }    from "@/infrastructure/db/client"
import { randomUUID }        from "crypto"

export class CrmController {

  constructor(private db: DatabaseClient) {}

  listClients = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { search } = req.query

      const conditions = ["c.dealership_id = $1"]
      const params: any[] = [dealership_id]

      if (search) {
        conditions.push(`(c.name ILIKE $2 OR c.phone ILIKE $2 OR c.email ILIKE $2)`)
        params.push(`%${search}%`)
      }

      const clients = await this.db.query<any>({
        text: `
          SELECT c.*,
            COUNT(l.id)   AS total_leads,
            COUNT(s.id)   AS total_sales
          FROM clients c
          LEFT JOIN leads l ON l.client_id = c.id
          LEFT JOIN sales s ON s.client_id = c.id
          WHERE ${conditions.join(" AND ")}
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `,
        params
      })

      return res.json({ data: clients, total: clients.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  getClient = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const rows = await this.db.query<any>({
        text: `
          SELECT c.*,
            json_agg(DISTINCT l.*) FILTER (WHERE l.id IS NOT NULL) AS leads,
            json_agg(DISTINCT s.*) FILTER (WHERE s.id IS NOT NULL) AS sales
          FROM clients c
          LEFT JOIN leads l ON l.client_id = c.id
          LEFT JOIN sales s ON s.client_id = c.id
          WHERE c.id = $1 AND c.dealership_id = $2
          GROUP BY c.id
        `,
        params: [req.params.id, dealership_id]
      })
      if (!rows[0]) return res.status(404).json({ error: "Cliente não encontrado" })
      return res.json(rows[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  createClient = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { name, phone, email, cpf, notes } = req.body
      const id = randomUUID()

      await this.db.query({
        text: `
          INSERT INTO clients (id, dealership_id, name, phone, email, cpf, notes, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
        `,
        params: [id, dealership_id, name, phone, email ?? null, cpf ?? null, notes ?? null]
      })

      return res.status(201).json({ id, name, phone, email, dealershipId: dealership_id })
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  updateClient = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { name, phone, email, notes } = req.body

      await this.db.query({
        text: `
          UPDATE clients
          SET name = COALESCE($1, name),
              phone = COALESCE($2, phone),
              email = COALESCE($3, email),
              notes = COALESCE($4, notes)
          WHERE id = $5 AND dealership_id = $6
        `,
        params: [name, phone, email, notes, req.params.id, dealership_id]
      })

      return res.json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  // Histórico completo do cliente: leads, vendas, conversas
  getTimeline = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any

      const [leads, sales] = await Promise.all([
        this.db.query<any>({
          text: `SELECT l.*, v.brand, v.model FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id WHERE l.client_id = $1 AND l.dealership_id = $2 ORDER BY l.created_at DESC`,
          params: [req.params.id, dealership_id]
        }),
        this.db.query<any>({
          text: `SELECT s.*, v.brand, v.model FROM sales s LEFT JOIN vehicles v ON v.id = s.vehicle_id WHERE s.client_id = $1 AND s.dealership_id = $2 ORDER BY s.created_at DESC`,
          params: [req.params.id, dealership_id]
        })
      ])

      return res.json({ clientId: req.params.id, leads, sales })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
}
