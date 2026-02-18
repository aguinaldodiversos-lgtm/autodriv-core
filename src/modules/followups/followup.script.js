function buildFollowupScript(lead, mode = "full") {
  const now = new Date();

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * 86400000);
  }

  const name = lead.name ? ` ${lead.name}` : "";

  const fullScript = [
    // DIA 0 — IMEDIATO
    {
      message: `Olá${name}! Tudo bem?
Vi que você se interessou pelo carro. Está procurando algo para o dia a dia ou tem algum modelo específico em mente?`,
      scheduled_at: now
    },

    // +20 MINUTOS
    {
      message: `Conseguiu ver as informações do carro?
Se quiser, posso te mostrar ele com calma aqui na loja.`,
      scheduled_at: addMinutes(now, 20)
    },

    // +3 HORAS
    {
      message: `Esse modelo tem bastante procura e costuma agradar quem busca economia e conforto.
Vale a pena ver pessoalmente.
Você consegue passar hoje no fim da tarde ou prefere amanhã?`,
      scheduled_at: addMinutes(now, 180)
    },

    // DIA 1
    {
      message: `Bom dia${name}!
Ontem você falou sobre o carro.
Conseguiu ver com calma?
Se quiser, pode passar aqui na loja para olhar sem compromisso.
Prefere vir hoje ou amanhã?`,
      scheduled_at: addDays(now, 1)
    }
  ];

  const lateScript = [
    // DIA 3
    {
      message: `Passando para te avisar que o carro ainda está disponível.
Quem procura esse tipo de modelo costuma decidir rápido.
Se quiser, posso te mostrar ele aqui na loja.
Você consegue passar hoje ou prefere outro dia?`,
      scheduled_at: addDays(now, 3)
    },

    // DIA 5
    {
      message: `Oi${name}! Tudo bem?
Ainda está procurando carro ou já resolveu por aí?
Se quiser, pode passar aqui na loja para ver algumas opções com calma.`,
      scheduled_at: addDays(now, 5)
    },

    // DIA 7
    {
      message: `Essa semana chegaram alguns carros que podem te interessar.
Se quiser, pode passar aqui pra dar uma olhada sem compromisso.
Prefere vir durante a semana ou no sábado?`,
      scheduled_at: addDays(now, 7)
    },

    // DIA 14
    {
      message: `Oi${name}!
Só passando para saber se você ainda está procurando carro.
Se quiser, posso separar algumas opções no seu perfil para você ver aqui na loja.`,
      scheduled_at: addDays(now, 14)
    },

    // DIA 30
    {
      message: `Olá${name}!
Ainda está pensando em trocar de carro?
Chegaram algumas opções bem interessantes aqui na loja.
Se quiser, passa aqui pra ver com calma e tomar um café com a gente.`,
      scheduled_at: addDays(now, 30)
    }
  ];

  if (mode === "late") {
    return lateScript;
  }

  return [...fullScript, ...lateScript];
}

module.exports = {
  buildFollowupScript
};
