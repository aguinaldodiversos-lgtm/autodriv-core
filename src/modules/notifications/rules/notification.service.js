const staleRule = require("./rules/staleLead.rule");
const hotRule = require("./rules/hotLead.rule");
const visitRule = require("./rules/visitReminder.rule");

async function generateNotifications(dealershipId) {

  const stale = await staleRule.checkStaleLeads(dealershipId);
  const hot = await hotRule.checkHotLeads(dealershipId);
  const visits = await visitRule.checkTodayVisits(dealershipId);

  return [
    ...stale,
    ...hot,
    ...visits
  ];
}

module.exports = {
  generateNotifications
};
