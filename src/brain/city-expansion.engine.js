const db = require("../config/db")

class CityExpansionEngine {

  async suggest() {

    const data = await db.query(
      `SELECT region,
              COUNT(*) as leads
       FROM leads
       GROUP BY region`
    )

    const ordenado = data.rows
      .map(r => ({
        region: r.region,
        leads: Number(r.leads)
      }))
      .sort((a,b)=>b.leads - a.leads)

    return ordenado[0]
  }
}

module.exports = CityExpansionEngine
