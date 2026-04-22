// src/interfaces/http/controllers/maintenance.controller.ts

import { Request, Response } from "express"
import { DatabaseClient }    from "@/infrastructure/db/client"
import { randomUUID }        from "crypto"

export class MaintenanceController {

  constructor(private db: DatabaseClient) {}

  list = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const orders = await this.db.query<any>({
        text: `
          SELECT mo.*,
            v.brand, v.model, v.plate,
            u.name AS technician_name
          FROM maintenance_orders mo
          LEFT JOIN vehicles v ON v.id = mo.vehicle_id
          LEFT JOIN users    u ON u.id = mo.assigned_user_id
          WHERE mo.dealership_id = $1
          ORDER BY mo.created_at DESC
        `,
        params: [dealership_id]
      })
      return res.json({ data: orders, total: orders.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  getById = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const rows = await this.db.query<any>({
        text: `
          SELECT mo.*,
            v.brand, v.model, v.plate,
            json_agg(mt.*)  FILTER (WHERE mt.id IS NOT NULL) AS tasks
          FROM maintenance_orders mo
          LEFT JOIN vehicles          v  ON v.id  = mo.vehicle_id
          LEFT JOIN maintenance_tasks mt ON mt.maintenance_order_id = mo.id
          WHERE mo.id = $1 AND mo.dealership_id = $2
          GROUP BY mo.id, v.brand, v.model, v.plate
        `,
        params: [req.params.id, dealership_id]
      })
      if (!rows[0]) return res.status(404).json({ error: "Ordem não encontrada" })
      return res.json(rows[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const { dealership_id, id: userId } = req.user as any
      const { vehicleId, description, type, estimatedCost, assignedUserId } = req.body
      const id = randomUUID()

      await this.db.query({
        text: `
          INSERT INTO maintenance_orders
            (id, dealership_id, vehicle_id, description, type,
             estimated_cost, assigned_user_id, status, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'open',NOW())
        `,
        params: [
          id, dealership_id, vehicleId, description,
          type ?? "general", estimatedCost ?? null,
          assignedUserId ?? userId
        ]
      })

      return res.status(201).json({ id, vehicleId, status: "open" })
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { status, actualCost, notes } = req.body

      await this.db.query({
        text: `
          UPDATE maintenance_orders
          SET status = $1,
              actual_cost = COALESCE($2, actual_cost),
              notes = COALESCE($3, notes),
              completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
          WHERE id = $4 AND dealership_id = $5
        `,
        params: [status, actualCost, notes, req.params.id, dealership_id]
      })

      return res.json({ success: true, status })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
}
