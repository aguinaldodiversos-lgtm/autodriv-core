// src/interfaces/http/controllers/contract.controller.ts
// Módulo de geração e gestão de contratos de compra e venda

import { Request, Response } from "express"
import { DatabaseClient }    from "@/infrastructure/db/client"
import { randomUUID }        from "crypto"
import * as path             from "path"
import * as fs               from "fs"

export class ContractController {

  constructor(private db: DatabaseClient) {}

  list = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const contracts = await this.db.query<any>({
        text: `
          SELECT ct.*,
            s.sale_price,
            v.brand, v.model, v.year, v.plate,
            c.name AS client_name, c.cpf AS client_cpf
          FROM contracts ct
          LEFT JOIN sales    s ON s.id = ct.sale_id
          LEFT JOIN vehicles v ON v.id = s.vehicle_id
          LEFT JOIN clients  c ON c.id = s.client_id
          WHERE ct.dealership_id = $1
          ORDER BY ct.created_at DESC
        `,
        params: [dealership_id]
      })
      return res.json({ data: contracts, total: contracts.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  getById = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const rows = await this.db.query<any>({
        text: `
          SELECT ct.*,
            s.sale_price, s.payment_method,
            v.brand, v.model, v.year, v.plate, v.mileage, v.color,
            c.name AS client_name, c.cpf AS client_cpf,
            c.phone AS client_phone, c.email AS client_email,
            d.name AS dealership_name, d.cnpj AS dealership_cnpj
          FROM contracts ct
          LEFT JOIN sales        s ON s.id = ct.sale_id
          LEFT JOIN vehicles     v ON v.id = s.vehicle_id
          LEFT JOIN clients      c ON c.id = s.client_id
          LEFT JOIN dealerships  d ON d.id = $2
          WHERE ct.id = $1 AND ct.dealership_id = $2
        `,
        params: [req.params.id, dealership_id]
      })
      if (!rows[0]) return res.status(404).json({ error: "Contrato não encontrado" })
      return res.json(rows[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const { saleId, type = "sale", terms } = req.body
      const id = randomUUID()

      // Verificar se venda existe
      const sales = await this.db.query<any>({
        text: `SELECT id FROM sales WHERE id = $1 AND dealership_id = $2`,
        params: [saleId, dealership_id]
      })
      if (!sales[0]) return res.status(404).json({ error: "Venda não encontrada" })

      await this.db.query({
        text: `
          INSERT INTO contracts
            (id, dealership_id, sale_id, type, terms, status, version, created_at)
          VALUES ($1,$2,$3,$4,$5,'draft',1,NOW())
        `,
        params: [id, dealership_id, saleId, type, terms ?? null]
      })

      return res.status(201).json({ id, saleId, status: "draft", version: 1 })
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  sendForApproval = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const rows = await this.db.query<any>({
        text: `SELECT status FROM contracts WHERE id = $1 AND dealership_id = $2`,
        params: [req.params.id, dealership_id]
      })
      if (!rows[0]) return res.status(404).json({ error: "Contrato não encontrado" })
      if (!["draft", "rejected"].includes(rows[0].status))
        return res.status(400).json({ error: "Apenas contratos em rascunho ou rejeitados podem ser enviados para aprovação" })

      await this.db.query({
        text: `UPDATE contracts SET status = 'pending_approval' WHERE id = $1`,
        params: [req.params.id]
      })

      return res.json({ success: true, status: "pending_approval" })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  approve = async (req: Request, res: Response) => {
    try {
      const { dealership_id, id: userId, role } = req.user as any
      if (!["manager", "admin"].includes(role))
        return res.status(403).json({ error: "Apenas gerentes e admins podem aprovar contratos" })

      await this.db.query({
        text: `
          UPDATE contracts
          SET status = 'approved', approved_by = $1, approved_at = NOW()
          WHERE id = $2 AND dealership_id = $3 AND status = 'pending_approval'
        `,
        params: [userId, req.params.id, dealership_id]
      })

      return res.json({ success: true, status: "approved" })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  reject = async (req: Request, res: Response) => {
    try {
      const { dealership_id, role } = req.user as any
      if (!["manager", "admin"].includes(role))
        return res.status(403).json({ error: "Apenas gerentes e admins podem rejeitar contratos" })

      const { reason } = req.body
      if (!reason) return res.status(400).json({ error: "Motivo de rejeição é obrigatório" })

      await this.db.query({
        text: `
          UPDATE contracts
          SET status = 'rejected', rejection_reason = $1
          WHERE id = $2 AND dealership_id = $3
        `,
        params: [reason, req.params.id, dealership_id]
      })

      return res.json({ success: true, status: "rejected" })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  generate = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const rows = await this.db.query<any>({
        text: `SELECT status FROM contracts WHERE id = $1 AND dealership_id = $2`,
        params: [req.params.id, dealership_id]
      })
      if (!rows[0]) return res.status(404).json({ error: "Contrato não encontrado" })
      if (rows[0].status !== "approved")
        return res.status(400).json({ error: "Apenas contratos aprovados podem ser gerados" })

      // Gerar hash do contrato
      const hash = require("crypto").createHash("md5")
        .update(`${req.params.id}-${Date.now()}`).digest("hex")

      const filePath = `/uploads/contracts/${hash}.pdf`

      await this.db.query({
        text: `UPDATE contracts SET file_path = $1, generated_at = NOW() WHERE id = $2`,
        params: [filePath, req.params.id]
      })

      return res.json({ success: true, filePath, hash })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
}
