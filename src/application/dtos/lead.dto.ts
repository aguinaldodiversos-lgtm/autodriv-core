// src/application/dtos/lead.dto.ts

export interface CreateLeadDTO {
  name:        string
  phone:       string
  email?:      string
  message?:    string
  source:      string
  vehicleId?:  string
  tenantId:    string
}

export interface UpdateLeadDTO {
  status?:          string
  assignedUserId?:  string
  notes?:           string
}

export interface LeadResponseDTO {
  id:              string
  tenantId:        string
  name:            string
  phone:           string
  email?:          string
  source:          string
  status:          string
  assignedUserId?: string
  createdAt:       Date
}
