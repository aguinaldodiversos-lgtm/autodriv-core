function shouldCreateCampaign(daysInStock, priceDiff) {
  return daysInStock >= 60 || priceDiff > 10;
}

module.exports = {
  shouldCreateCampaign
};
