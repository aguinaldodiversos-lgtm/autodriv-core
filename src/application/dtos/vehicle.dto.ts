// src/application/dtos/vehicle.dto.ts

export interface CreateVehicleDTO {
  brand:         string
  model:         string
  year:          number
  color?:        string
  plate?:        string
  mileage?:      number
  price:         number
  cost?:         number
  fuelType?:     string
  transmission?: string
  description?:  string
}

export interface VehicleResponseDTO {
  id:            string
  dealershipId:  string
  brand:         string
  model:         string
  year:          number
  price:         number
  status:        "available" | "reserved" | "sold"
  coverImage?:   string
  createdAt:     Date
}
