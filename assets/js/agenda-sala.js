/**
 * Agenda da reserva de sala por hora (site). Regras puras, iguais às do
 * servidor (reservar-sala-online): hora cheia, dias e horário da janela,
 * antecedência mínima. Horário de Brasília fixo (UTC-3).
 * Funciona no Node (testes) e no navegador (window.CWAgenda).
 */
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.CWAgenda = api;
})(typeof self !== 'undefined' ? self : this, function () {
  var HORA_MS = 3600000;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var hora = function (hhmm) { return Number(String(hhmm).split(':')[0]); };

  function isoBRT(data, h) {
    return data + 'T' + pad(h) + ':00:00-03:00';
  }

  function diaDaSemana(data) {
    var p = data.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }

  function dataBRT(agora) {
    return new Date(agora.getTime() - 3 * HORA_MS).toISOString().slice(0, 10);
  }

  /** Horários de 1 hora da janela para a sala: { hora, livre, motivo: fechado|passado|ocupado|null }. */
  function horariosDoDia(data, janela, ocupados, salaId, agora) {
    var abre = hora(janela.abre), fecha = hora(janela.fecha);
    var aberto = janela.diasSemana.indexOf(diaDaSemana(data)) >= 0;
    var limite = agora.getTime() + janela.antecedenciaMinMinutos * 60000;
    var daSala = (ocupados || []).filter(function (o) { return o.sala_id === salaId; });
    var lista = [];
    for (var h = abre; h < fecha; h++) {
      var ini = new Date(isoBRT(data, h)).getTime();
      var fim = ini + HORA_MS;
      var motivo = null;
      if (!aberto) motivo = 'fechado';
      else if (ini < limite) motivo = 'passado';
      else if (daSala.some(function (o) { return new Date(o.start_at).getTime() < fim && new Date(o.end_at).getTime() > ini; })) motivo = 'ocupado';
      lista.push({ hora: h, livre: !motivo, motivo: motivo });
    }
    return lista;
  }

  /** Quantas horas seguidas livres a partir de `inicio`, até `maxHoras`. */
  function maxHorasAPartir(horarios, inicio, maxHoras) {
    var i = horarios.findIndex(function (x) { return x.hora === inicio; });
    var n = 0;
    while (i >= 0 && i + n < horarios.length && horarios[i + n].livre && n < maxHoras) n++;
    return n;
  }

  /** Hoje (se ainda houver horário com antecedência) ou o próximo dia de funcionamento. */
  function proximoDiaReservavel(agora, janela) {
    var data = dataBRT(agora);
    for (var i = 0; i < 14; i++) {
      var d = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10) + i)).toISOString().slice(0, 10);
      var h = horariosDoDia(d, janela, [], '', agora);
      if (h.some(function (x) { return x.livre; })) return d;
    }
    return data;
  }

  return { isoBRT: isoBRT, diaDaSemana: diaDaSemana, dataBRT: dataBRT, horariosDoDia: horariosDoDia, maxHorasAPartir: maxHorasAPartir, proximoDiaReservavel: proximoDiaReservavel };
});
