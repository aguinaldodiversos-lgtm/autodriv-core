// src/application/dtos/sale.dto.ts

export interface CreateSaleDTO {
  leadId:        string
  vehicleId:     string
  clientId:      string
  salePrice:     number
  paymentMethod: string
  notes?:        string
}

export interface SaleResponseDTO {
  id:            string
  dealershipId:  string
  leadId:        string
  vehicleId:     string
  clientId:      string
  salePrice:     number
  paymentMethod: string
  status:        string
  createdAt:     Date
}
