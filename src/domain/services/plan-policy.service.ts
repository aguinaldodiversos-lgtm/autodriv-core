export interface PlanCapabilities {
  maxLeads: number
  maxCampaigns: number
  premiumAI: boolean
  autoBudget: boolean
  predictiveEngine: boolean
  multiStore: boolean
}

export class PlanPolicyService {

  getCapabilities(plan: string): PlanCapabilities {

    switch (plan) {

      case "starter":
        return {
          maxLeads: 200,
          maxCampaigns: 1,
          premiumAI: false,
          autoBudget: false,
          predictiveEngine: false,
          multiStore: false
        }

      case "growth":
        return {
          maxLeads: 800,
          maxCampaigns: 5,
          premiumAI: true,
          autoBudget: true,
          predictiveEngine: true,
          multiStore: false
        }

      case "performance":
        return {
          maxLeads: 2000,
          maxCampaigns: 15,
          premiumAI: true,
          autoBudget: true,
          predictiveEngine: true,
          multiStore: true
        }

      default:
        return {
          maxLeads: 0,
          maxCampaigns: 0,
          premiumAI: false,
          autoBudget: false,
          predictiveEngine: false,
          multiStore: false
        }
    }
  }
}
