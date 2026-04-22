// src/application/use-cases/vehicle/list-vehicles.usecase.ts

import { DatabaseClient } from "@/infrastructure/db/client"

export interface VehicleFilters {
  status?:   string
  brand?:    string
  minPrice?: number
  maxPrice?: number
}

export class ListVehiclesUseCase {

  constructor(private db: DatabaseClient) {}

  async execute(dealershipId: string, filters: VehicleFilters = {}) {

    const conditions = ["v.dealership_id = $1"]
    const params: any[] = [dealershipId]
    let i = 2

    if (filters.status) {
      conditions.push(`v.status = $${i++}`)
      params.push(filters.status)
    }
    if (filters.brand) {
      conditions.push(`LOWER(v.brand) ILIKE $${i++}`)
      params.push(`%${filters.brand.toLowerCase()}%`)
    }
    if (filters.minPrice !== undefined) {
      conditions.push(`v.price >= $${i++}`)
      params.push(filters.minPrice)
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(`v.price <= $${i++}`)
      params.push(filters.maxPrice)
    }

    const vehicles = await this.db.query<any>({
      text: `
        SELECT v.*,
               COALESCE(
                 (SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY created_at ASC LIMIT 1),
                 null
               ) AS cover_image
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.created_at DESC
      `,
      params
    })

    return vehicles
  }
}
