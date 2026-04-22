// src/read-models/dashboard.view.ts
// Read Model de Dashboard — KPIs consolidados do negócio

import { DatabaseClient } from "@/infrastructure/db/client"
import { logger }         from "@/infrastructure/logger/logger"

export interface DashboardView {
  period: {
    month: number
    year:  number
  }
  sales: {
    total:       number
    revenue:     number
    avgTicket:   number
    growth:      number   // % vs mês anterior
  }
  leads: {
    total:       number
    converted:   number
    conversionRate: number
    avgTimeToClose: number  // dias
  }
  stock: {
    totalVehicles:  number
    available:      number
    sold:           number
    avgDaysInStock: number
    capitalTrapped: number
  }
  finance: {
    revenue:    number
    expenses:   number
    balance:    number
    pending:    number
  }
  topSellers: {
    id:     string
    name:   string
    sales:  number
    revenue: number
  }[]
}

export class DashboardViewBuilder {

  constructor(private db: DatabaseClient) {}

  async build(dealershipId: string, month?: number, year?: number): Promise<DashboardView> {

    const m = month ?? new Date().getMonth() + 1
    const y = year  ?? new Date().getFullYear()

    logger.info(`📊 Construindo DashboardView | tenant: ${dealershipId} | ${m}/${y}`)

    const [salesData, leadsData, stockData, financeData, topSellers] = await Promise.all([
      this.getSalesMetrics(dealershipId, m, y),
      this.getLeadsMetrics(dealershipId, m, y),
      this.getStockMetrics(dealershipId),
      this.getFinanceMetrics(dealershipId, m, y),
      this.getTopSellers(dealershipId, m, y)
    ])

    return {
      period:     { month: m, year: y },
      sales:      salesData,
      leads:      leadsData,
      stock:      stockData,
      finance:    financeData,
      topSellers
    }
  }

  private async getSalesMetrics(dealershipId: string, month: number, year: number) {

    const [current, previous] = await Promise.all([
      this.db.query<any>({
        text: `
          SELECT COUNT(*) AS total,
                 COALESCE(SUM(sale_price), 0) AS revenue
          FROM sales
          WHERE dealership_id = $1
            AND EXTRACT(MONTH FROM created_at) = $2
            AND EXTRACT(YEAR  FROM created_at) = $3
        `,
        params: [dealershipId, month, year]
      }),
      this.db.query<any>({
        text: `
          SELECT COALESCE(SUM(sale_price), 0) AS revenue
          FROM sales
          WHERE dealership_id = $1
            AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
            AND created_at <  DATE_TRUNC('month', NOW())
        `,
        params: [dealershipId]
      })
    ])

    const total   = Number(current[0]?.total   ?? 0)
    const revenue = Number(current[0]?.revenue ?? 0)
    const prevRev = Number(previous[0]?.revenue ?? 0)

    return {
      total,
      revenue,
      avgTicket: total > 0 ? revenue / total : 0,
      growth:    prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : 0
    }
  }

  private async getLeadsMetrics(dealershipId: string, month: number, year: number) {

    const rows = await this.db.query<any>({
      text: `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'converted') AS converted,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
            FILTER (WHERE status = 'converted') AS avg_days
        FROM leads
        WHERE dealership_id = $1
          AND EXTRACT(MONTH FROM created_at) = $2
          AND EXTRACT(YEAR  FROM created_at) = $3
      `,
      params: [dealershipId, month, year]
    })

    const total     = Number(rows[0]?.total     ?? 0)
    const converted = Number(rows[0]?.converted ?? 0)

    return {
      total,
      converted,
      conversionRate:  total > 0 ? (converted / total) * 100 : 0,
      avgTimeToClose:  Number(rows[0]?.avg_days ?? 0)
    }
  }

  private async getStockMetrics(dealershipId: string) {

    const rows = await this.db.query<any>({
      text: `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'available') AS available,
          COUNT(*) FILTER (WHERE status = 'sold')      AS sold,
          AVG(NOW() - entry_date)
            FILTER (WHERE status = 'available') AS avg_days,
          COALESCE(SUM(cost) FILTER (WHERE status = 'available'), 0) AS capital
        FROM vehicles
        WHERE dealership_id = $1
      `,
      params: [dealershipId]
    })

    const row = rows[0] ?? {}

    return {
      totalVehicles:  Number(row.total     ?? 0),
      available:      Number(row.available  ?? 0),
      sold:           Number(row.sold       ?? 0),
      avgDaysInStock: Number(row.avg_days   ?? 0),
      capitalTrapped: Number(row.capital    ?? 0)
    }
  }

  private async getFinanceMetrics(dealershipId: string, month: number, year: number) {

    const rows = await this.db.query<any>({
      text: `
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'income'  AND status = 'paid'), 0)    AS revenue,
          COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND status = 'paid'), 0)    AS expenses,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)                       AS pending
        FROM financial_transactions
        WHERE dealership_id = $1
          AND EXTRACT(MONTH FROM created_at) = $2
          AND EXTRACT(YEAR  FROM created_at) = $3
      `,
      params: [dealershipId, month, year]
    })

    const row = rows[0] ?? {}
    const revenue  = Number(row.revenue  ?? 0)
    const expenses = Number(row.expenses ?? 0)

    return {
      revenue,
      expenses,
      balance: revenue - expenses,
      pending: Number(row.pending ?? 0)
    }
  }

  private async getTopSellers(dealershipId: string, month: number, year: number) {

    return this.db.query<any>({
      text: `
        SELECT u.id, u.name,
               COUNT(s.id)              AS sales,
               COALESCE(SUM(s.sale_price), 0) AS revenue
        FROM sales s
        JOIN users u ON u.id = s.user_id
        WHERE s.dealership_id = $1
          AND EXTRACT(MONTH FROM s.created_at) = $2
          AND EXTRACT(YEAR  FROM s.created_at) = $3
        GROUP BY u.id, u.name
        ORDER BY revenue DESC
        LIMIT 5
      `,
      params: [dealershipId, month, year]
    })
  }
}
