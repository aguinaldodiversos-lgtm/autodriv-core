module.exports = {
  trial: {
    name: "Trial",
    duration_days: 15,
    limits: {
      vehicles: "unlimited",
      leads: "unlimited",
      users: "unlimited",
      whatsapp: true,
      ia: true,
      ia_limit: 200 // limite de mensagens IA no trial
    }
  },

  starter: {
    name: "Starter",
    limits: {
      vehicles: 10,
      leads: 200,
      users: 1,
      whatsapp: true,
      ia: false
    }
  },

  pro: {
    name: "Pro",
    limits: {
      vehicles: 30,
      leads: 1000,
      users: 3,
      whatsapp: true,
      ia: false
    }
  },

  master: {
    name: "Master",
    limits: {
      vehicles: "unlimited",
      leads: "unlimited",
      users: "unlimited",
      whatsapp: true,
      ia: true,
      ia_limit: "unlimited"
    }
  }
};
