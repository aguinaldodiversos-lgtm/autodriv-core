// src/interfaces/http/controllers/vehicle.controller.ts

import { Request, Response } from "express"
import { ListVehiclesUseCase }  from "@/application/use-cases/vehicle/list-vehicles.usecase"
import { CreateVehicleUseCase } from "@/application/use-cases/vehicle/create-vehicle.usecase"
import { DatabaseClient }       from "@/infrastructure/db/client"
import { EventBus }             from "@/infrastructure/event-bus/event.bus"

export class VehicleController {

  constructor(
    private db:       DatabaseClient,
    private eventBus: EventBus
  ) {}

  list = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const useCase = new ListVehiclesUseCase(this.db)
      const vehicles = await useCase.execute(dealership_id, req.query as any)
      return res.json({ data: vehicles, total: vehicles.length })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const useCase = new CreateVehicleUseCase(this.db, this.eventBus)
      const vehicle = await useCase.execute(dealership_id, req.body)
      return res.status(201).json(vehicle)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  getById = async (req: Request, res: Response) => {
    try {
      const { dealership_id } = req.user as any
      const rows = await this.db.query<any>({
        text: `
          SELECT v.*,
            ARRAY_AGG(vi.url) FILTER (WHERE vi.url IS NOT NULL) AS images
          FROM vehicles v
          LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id
          WHERE v.id = $1 AND v.dealership_id = $2
          GROUP BY v.id
        `,
        params: [req.params.id, dealership_id]
      })
      if (!rows[0]) return res.status(404).json({ error: "Veículo não encontrado" })
      return res.json(rows[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
}
