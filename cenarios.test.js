// Testes dos cenários (node --test). Cada teste reproduz um evento medido (E) e verifica a física.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fisica.js');
const { CENARIOS, criarJogo } = require('./cenarios.js');

const cen = (id) => CENARIOS.find((c) => c.id === id);
const direita = { direita: true };

// anda para a direita até morrer, cair no subterrâneo ou esgotar quadros
function andarAte(j, maxQuadros, condicao) {
  for (let i = 0; i < maxQuadros; i++) {
    F.passo(j, direita);
    if (condicao(j)) return i;
  }
  return -1;
}

test('catálogo: cada cenário tem evidência e posições em faixa válida', () => {
  for (const c of CENARIOS) {
    if (c.status) assert.match(c.evidencia, /NÃO REPRODUZIDO|PARCIAL|NÃO REVALIDADO/);
    else assert.ok(c.evidencia.startsWith('E:'), c.id + ' sem evidência E');
    for (const b of c.buracos) assert.ok(b.ini >= 0x08 && b.fim <= 0x94 && b.ini <= b.fim, c.id + ' buraco inválido');
  }
});

test('coleta-tipo-5: pontua dentro da faixa e não fora (E)', () => {
  const j = criarJogo(F, cen('coleta-tipo-5'));
  j.X = 0x78; const p0 = j.pontos;
  F.passo(j, {});
  assert.equal(j.pontos - p0, 4000);
  j.X = 0x50; const p1 = j.pontos;
  F.passo(j, {});
  assert.equal(j.pontos, p1);
});

test('buraco-letal-0x33: andando sobre X = 0x33 a queda mata (E)', () => {
  const j = criarJogo(F, cen('buraco-letal-0x33'));
  j.X = 0x2E;
  const n = andarAte(j, 200, (x) => x.morto);
  assert.ok(n >= 0, 'deveria morrer');
  assert.ok(j.X >= 0x30 && j.X <= 0x36, 'morte dentro do buraco, X = ' + j.X.toString(16));
});

test('buraco-letal-0x4d: andando sobre X = 0x4D a queda mata (E)', () => {
  const j = criarJogo(F, cen('buraco-letal-0x4d'));
  j.X = 0x49;
  const n = andarAte(j, 200, (x) => x.morto);
  assert.ok(n >= 0, 'deveria morrer');
  assert.ok(j.X >= 0x4B && j.X <= 0x4D);
});

test('buraco-nao-letal-0x77: a queda leva ao subterrâneo sem morte (E)', () => {
  const j = criarJogo(F, cen('buraco-nao-letal-0x77'));
  j.X = 0x73;
  const n = andarAte(j, 200, (x) => x.subterraneo || x.morto);
  assert.ok(n >= 0);
  assert.equal(j.subterraneo, true);
  assert.equal(j.morto, false);
});

test('armadilha-0x3a: andando para a direita, trava em X = 0x3A e perde 1 ponto por quadro (E)', () => {
  const j = criarJogo(F, cen('armadilha-0x3a'));
  j.X = 0x38;
  andarAte(j, 60, (x) => x.X === 0x3A);
  assert.equal(j.X, 0x3A);
  const p0 = j.pontos;
  for (let i = 0; i < 30; i++) F.passo(j, direita);
  assert.equal(j.X, 0x3A);
  assert.equal(j.pontos, p0 - 30);
});
