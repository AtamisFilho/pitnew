// Testes da mecânica do cipó (node --test).
// Estes testes verificam a regra que o protótipo implementa, não a captura no jogo original.
// A captura no cipó foi medida antes da correção do emulador (dread: RAM antes de ROM) e NÃO foi
// reproduzida com o emulador corrigido: Harry cai em X 0x44–0x52 em todas as variantes testadas.
// Por isso, o que segue é regra do protótipo (a partir da medição antiga), marcada como não verificada.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fisica.js');
const C = F.constantes;
const C2 = require('./cenarios.js');

const baixo = { baixo: true };
const cima = { cima: true };
const nada = {};
const direita = { direita: true };
const esquerda = { esquerda: true };

// Harry no chão, na faixa de X do cipó, na zona com cipó, pronto para a captura.
function noChaoComCipo() {
  const j = F.novoJogo({ cipo: true, varianteZona: 0b0100 });
  j.X = 0x48;
  return j;
}

// Captura pela manete para baixo (regra do protótipo).
function capturado() {
  const j = noChaoComCipo();
  F.passo(j, baixo);
  return j;
}

test('cipó: a cena do cenário cipo-0x4c não está marcada como fato verificado', () => {
  const cenario = C2.CENARIOS.find((c) => c.id === 'cipo-0x4c');
  assert.ok(cenario, 'cenário cipo-0x4c existe');
  assert.match(cenario.evidencia, /não reproduzid/i);
});

test('cipó: sem cipó na zona, a manete para baixo não captura (regra do protótipo)', () => {
  const j = F.novoJogo({ cipo: false, varianteZona: 0b0100 });
  j.X = 0x48;
  F.passo(j, baixo);
  assert.equal(j.capturado, false);
});

test('cipó: fora da faixa de X (0x44–0x52) não captura (regra do protótipo)', () => {
  for (const X of [0x43, 0x53]) {
    const j = noChaoComCipo();
    j.X = X;
    F.passo(j, baixo);
    assert.equal(j.capturado, false, `X = ${X.toString(16)}`);
  }
});

test('cipó: na faixa, a manete para baixo captura e fixa X em 0x4C', () => {
  for (const X of [0x44, 0x48, 0x52]) {
    const j = noChaoComCipo();
    j.X = X;
    F.passo(j, baixo);
    assert.equal(j.capturado, true, `X = ${X.toString(16)}`);
    assert.equal(j.X, C.CIPO_X_FIXO);
    assert.equal(j.ec, 0x0C);
  }
});

test('cipó: sem a manete para baixo, não há captura no chão', () => {
  const j = noChaoComCipo();
  for (let i = 0; i < 20; i++) F.passo(j, nada);
  assert.equal(j.capturado, false);
  F.passo(j, cima);
  assert.equal(j.capturado, false);
});

test('cipó: capturado, EC sobe 1 a cada 9 quadros e a altura segue 0x32 + 4·(EC − 0x0C)', () => {
  const j = capturado();
  assert.equal(j.E9, 0x32);
  for (let fase = 1; fase <= 3; fase++) {
    for (let i = 0; i < C.CIPO_QUADROS_PASSO; i++) F.passo(j, baixo);
    assert.equal(j.ec, 0x0C + fase);
    assert.equal(j.E9, 0x32 + 4 * fase);
  }
});

test('cipó: com a manete para baixo até EC = 0x16, cai ao subterrâneo (0x56), sem morte', () => {
  const j = capturado();
  for (let i = 0; i < C.CIPO_QUADROS_PASSO * 12 && j.capturado; i++) F.passo(j, baixo);
  assert.equal(j.capturado, false);
  assert.equal(j.subterraneo, true);
  assert.equal(j.E9, C.SUBTERRANEO);
  assert.equal(j.morto, false);
});

test('cipó: com a manete parada, a fase não muda', () => {
  const j = capturado();
  for (let i = 0; i < 60; i++) F.passo(j, nada);
  assert.equal(j.ec, 0x0C);
  assert.equal(j.E9, 0x32);
  assert.equal(j.capturado, true);
});

test('cipó: direita e esquerda não mudam a fase', () => {
  const j = capturado();
  for (let i = 0; i < 30; i++) F.passo(j, i % 2 ? direita : esquerda);
  assert.equal(j.ec, 0x0C);
  assert.equal(j.capturado, true);
});

test('cipó: manete para cima sobe (EC − 1) e para no piso 0x0B', () => {
  const j = capturado();
  for (let i = 0; i < C.CIPO_QUADROS_PASSO * 4; i++) F.passo(j, cima);
  assert.equal(j.ec, C.CIPO_EC_MIN);
  assert.equal(j.E9, 0x32 + 4 * (C.CIPO_EC_MIN - 0x0C));
  assert.equal(j.capturado, true);
});

test('cipó: do subterrâneo, a manete para cima agarra em EC = 0x15 e sobe', () => {
  const j = F.novoJogo({ cipo: true, varianteZona: 0b0100 });
  j.subterraneo = true; j.E9 = C.SUBTERRANEO; j.X = 0x48;
  F.passo(j, cima);
  assert.equal(j.capturado, true);
  assert.equal(j.subterraneo, false);
  assert.equal(j.ec, C.CIPO_ENTRADA_SUBTERRANEO);
  assert.equal(j.E9, C.SUBTERRANEO);
  for (let i = 0; i < C.CIPO_QUADROS_PASSO * 3; i++) F.passo(j, cima);
  assert.equal(j.ec, 0x12);
  assert.equal(j.E9, 0x32 + 4 * (0x12 - 0x0C));
});
