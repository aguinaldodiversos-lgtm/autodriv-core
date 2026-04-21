const staleRule = require("./staleLead.rule");
const hotRule = require("./hotLead.rule");
const visitRule = require("./visitReminder.rule");

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
