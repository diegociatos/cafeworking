// node --test scripts/agenda-sala.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { horariosDoDia, maxHorasAPartir, isoBRT, diaDaSemana, proximoDiaReservavel } = require('../assets/js/agenda-sala.js');

const janela = { diasSemana: [1, 2, 3, 4, 5], abre: '08:00', fecha: '18:00', antecedenciaMinMinutos: 60, maxHoras: 10 };

test('ISO em horário de Brasília e dia da semana', () => {
  assert.equal(isoBRT('2026-09-15', 9), '2026-09-15T09:00:00-03:00');
  assert.equal(diaDaSemana('2026-09-15'), 2); // terça
  assert.equal(diaDaSemana('2026-09-19'), 6); // sábado
});

test('horários do dia: ocupados por sala, sobreposição parcial conta', () => {
  const ocupados = [
    { sala_id: 's1', start_at: '2026-09-15T12:00:00Z', end_at: '2026-09-15T14:00:00Z' }, // 9h–11h BRT
    { sala_id: 's1', start_at: '2026-09-15T17:30:00Z', end_at: '2026-09-15T18:00:00Z' }, // 14h30–15h BRT
    { sala_id: 's2', start_at: '2026-09-15T11:00:00Z', end_at: '2026-09-15T21:00:00Z' },
  ];
  const agora = new Date('2026-09-14T12:00:00Z');
  const h = horariosDoDia('2026-09-15', janela, ocupados, 's1', agora);
  assert.equal(h.length, 10);
  assert.deepEqual(h.map((x) => x.hora), [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(h.filter((x) => !x.livre).map((x) => x.hora), [9, 10, 14]);
  assert.equal(h.find((x) => x.hora === 9).motivo, 'ocupado');
});

test('antecedência mínima bloqueia o que está perto de agora', () => {
  const agora = new Date('2026-09-15T12:30:00Z'); // 9h30 BRT
  const h = horariosDoDia('2026-09-15', janela, [], 's1', agora);
  assert.deepEqual(h.filter((x) => !x.livre).map((x) => [x.hora, x.motivo]), [[8, 'passado'], [9, 'passado'], [10, 'passado']]);
  assert.equal(h.find((x) => x.hora === 11).livre, true);
});

test('fim de semana não tem horário', () => {
  const h = horariosDoDia('2026-09-19', janela, [], 's1', new Date('2026-09-14T12:00:00Z'));
  assert.equal(h.every((x) => !x.livre && x.motivo === 'fechado'), true);
});

test('duração máxima a partir de um horário para no primeiro ocupado', () => {
  const h = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hora) => ({ hora, livre: ![11, 15].includes(hora) }));
  assert.equal(maxHorasAPartir(h, 8, 10), 3);
  assert.equal(maxHorasAPartir(h, 12, 10), 3);
  assert.equal(maxHorasAPartir(h, 16, 10), 2);
  assert.equal(maxHorasAPartir(h, 12, 2), 2);
  assert.equal(maxHorasAPartir(h, 11, 10), 0);
});

test('próximo dia reservável pula fim de semana e dia sem horário', () => {
  assert.equal(proximoDiaReservavel(new Date('2026-09-18T20:30:00Z'), janela), '2026-09-21'); // sexta 17h30 → segunda
  assert.equal(proximoDiaReservavel(new Date('2026-09-15T12:00:00Z'), janela), '2026-09-15'); // terça 9h → hoje
});
