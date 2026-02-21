const db = require("../config/db")

class ExecutiveReportService {
  async save(tenantId, report) {
    await db.query(
      `INSERT INTO executive_reports (tenant_id, data)
       VALUES ($1, $2)`,
      [tenantId, report]
    )
  }

  async history(tenantId) {
    return db.query(
      `SELECT created_at, data
       FROM executive_reports
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    )
  }
}

module.exports = ExecutiveReportService
