// src/application/use-cases/sale/create-sale.usecase.ts

import { randomUUID }     from "crypto"
import { DatabaseClient } from "@/infrastructure/db/client"
import { EventBus }       from "@/infrastructure/event-bus/event.bus"
import { DomainEvents }   from "@/domain/events/domain-events"

export interface CreateSaleDTO {
  leadId:        string
  vehicleId:     string
  clientId:      string
  userId:        string       // vendedor responsável
  salePrice:     number
  paymentMethod: string
  notes?:        string
}

export class CreateSaleUseCase {

  constructor(
    private db:       DatabaseClient,
    private eventBus: EventBus
  ) {}

  async execute(dealershipId: string, data: CreateSaleDTO) {

    const saleId = randomUUID()
    const now    = new Date()

    // Criar venda
    await this.db.query({
      text: `
        INSERT INTO sales
          (id, dealership_id, lead_id, vehicle_id, client_id, user_id,
           sale_price, payment_method, notes, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_approval',$10)
      `,
      params: [
        saleId, dealershipId, data.leadId, data.vehicleId,
        data.clientId, data.userId, data.salePrice,
        data.paymentMethod, data.notes ?? null, now
      ]
    })

    // Marcar veículo como vendido
    await this.db.query({
      text: `UPDATE vehicles SET status = 'sold' WHERE id = $1`,
      params: [data.vehicleId]
    })

    // Atualizar lead para convertido
    await this.db.query({
      text: `UPDATE leads SET status = 'converted' WHERE id = $1`,
      params: [data.leadId]
    })

    // Publicar evento de venda
    await this.eventBus.publish({
      id:         randomUUID(),
      name:       "sale.completed",
      tenantId:   dealershipId,
      payload:    {
        saleId,
        vehicleId:  data.vehicleId,
        clientId:   data.clientId,
        salePrice:  data.salePrice,
        vehicleScore: 70, leadScore: 80, channelScore: 65   // scores default
      },
      occurredAt: now
    })

    return { id: saleId, ...data, dealershipId, status: "pending_approval", createdAt: now }
  }
}
