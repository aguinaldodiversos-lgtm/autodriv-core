// src/brain/visit-followup.engine.js

const whatsapp = require("../modules/whatsapp/whatsapp.service")

class VisitFollowUpEngine {

  async sendInitial(lead) {
    await whatsapp.sendMessage(
      lead.phone,
      "Recebemos seu interesse. Qual melhor horário para você visitar a loja?"
    )
  }

  async sendReminder(lead, dateTime) {
    await whatsapp.sendMessage(
      lead.phone,
      `Confirmando sua visita dia ${dateTime}. Podemos contar com você?`
    )
  }

  async sendNoShowRecovery(lead) {
    await whatsapp.sendMessage(
      lead.phone,
      "Sentimos sua ausência. Podemos reagendar sua visita?"
    )
  }
}

module.exports = VisitFollowUpEngine
