export const DomainEvents = {
  LeadCreated:        "lead.created",
  LeadUpdated:        "lead.updated",
  LeadConverted:      "lead.converted",
  VisitScheduled:     "visit.scheduled",
  VisitCompleted:     "visit.completed",
  SaleCompleted:      "sale.completed",
  VehicleUpdated:     "vehicle.updated",
  CampaignUpdated:    "campaign.updated",
  SnapshotGenerated:  "snapshot.generated",
  PremiumAIRequested: "premium.ai.requested",
  MaintenanceUpdated: "maintenance.updated",
  ContractApproved:   "contract.approved"
} as const

export type DomainEventName = typeof DomainEvents[keyof typeof DomainEvents]
