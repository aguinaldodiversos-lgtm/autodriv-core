// src/brain/reschedule.engine.js

const whatsapp = require("../modules/whatsapp/whatsapp.service")

class RescheduleEngine {

  async attempt(lead) {

    const newDate = this.nextBestSlot()

    await whatsapp.sendMessage(
      lead.phone,
      `Podemos reagendar sua visita para ${newDate}?`
    )

    return newDate
  }

  nextBestSlot() {

    const now = new Date()
    now.setDate(now.getDate() + 1)
    now.setHours(10, 0, 0)

    return now.toLocaleString()
  }
}

module.exports = RescheduleEngine
