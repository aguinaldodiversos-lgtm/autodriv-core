module.exports = {
  trial: {
    name: "Trial",
    limits: {
      vehicles: "unlimited",
      leads: "unlimited",
      users: "unlimited"
    }
  },

  starter: {
    name: "Starter",
    limits: {
      vehicles: 10,
      leads: 200,
      users: 1
    }
  },

  pro: {
    name: "Pro",
    limits: {
      vehicles: 30,
      leads: 1000,
      users: 3
    }
  },

  master: {
    name: "Master",
    limits: {
      vehicles: "unlimited",
      leads: "unlimited",
      users: "unlimited"
    }
  }
};
