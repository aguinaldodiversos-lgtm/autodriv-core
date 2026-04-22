// src/application/use-cases/vehicle/create-vehicle.usecase.ts

import { randomUUID }     from "crypto"
import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus }       from "@/infrastructure/event-bus/event.bus"
import { DomainEvents }   from "@/domain/events/domain-events"

export interface CreateVehicleDTO {
  brand:       string
  model:       string
  year:        number
  color?:      string
  plate?:      string
  mileage?:    number
  price:       number
  cost?:       number
  fuelType?:   string
  transmission?: string
  description?: string
}

export class CreateVehicleUseCase {

  constructor(
    private db:       DatabaseClient,
    private eventBus: EventBus
  ) {}

  async execute(dealershipId: string, data: CreateVehicleDTO) {

    const id = randomUUID()
    const now = new Date()

    await this.db.query({
      text: `
        INSERT INTO vehicles
          (id, dealership_id, brand, model, year, color, plate, mileage,
           price, cost, fuel_type, transmission, description, status, entry_date, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'available',$14,$14)
      `,
      params: [
        id, dealershipId, data.brand, data.model, data.year,
        data.color ?? null, data.plate ?? null, data.mileage ?? null,
        data.price, data.cost ?? null, data.fuelType ?? null,
        data.transmission ?? null, data.description ?? null, now
      ]
    })

    await this.eventBus.publish({
      id:         randomUUID(),
      name:       DomainEvents.VehicleUpdated,
      tenantId:   dealershipId,
      payload:    { vehicleId: id, action: "created", price: data.price },
      occurredAt: now
    })

    return { id, ...data, dealershipId, status: "available", createdAt: now }
  }
}
