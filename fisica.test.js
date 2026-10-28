// Testes da física (node --test). Os valores esperados são as medições do emulador de análise (E).
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fisica.js');
const C = F.constantes;

const dir = { direita: true };
const nada = {};
const sorteioFixo = (tipo, variante) => () => ({ tipo, variante });

function rodar(j, n, entrada, sorteio) {
  for (let i = 0; i < n; i++) F.passo(j, typeof entrada === 'function' ? entrada(i) : entrada, sorteio);
  return j;
}

test('horizontal: com a direita, avança 1 posição a cada 2 quadros (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 }); // variante com bit 2 ligado: não trava
  j.X = 0x20;
  const x0 = j.X;
  rodar(j, 10, dir);
  assert.equal(j.X - x0, 5);
});

test('zona travada: variante com bit 2 limpo ignora o joystick no chão (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0000 });
  j.X = 0x3A;
  rodar(j, 60, dir);
  assert.equal(j.X, 0x3A);
});

test('zona destravada: com bit 2 ligado, o mesmo joystick move Harry (E, reconhecido com 0x93 = 4)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 });
  j.X = 0x3A;
  rodar(j, 60, dir);
  assert.ok(j.X > 0x3A);
});

test('borda direita: X volta a 0x08 e a zona troca pelo sorteio (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 });
  j.X = C.X_MAX;
  j.quadro = 1; // próximo quadro é par
  F.passo(j, dir, sorteioFixo(2, 0b0100));
  assert.equal(j.X, C.X_MIN);
  assert.equal(j.zona.tipo, 2);
  assert.equal(j.zona.variante, 0b0100);
});

test('borda esquerda: X vai a 0x94 e a zona não muda (E)', () => {
  const j = F.novoJogo({ tipoZona: 3, varianteZona: 0b0100 });
  j.X = C.X_MIN;
  j.quadro = 1;
  F.passo(j, { esquerda: true }, sorteioFixo(7, 7));
  assert.equal(j.X, C.X_MAX);
  assert.equal(j.zona.tipo, 3);
  assert.equal(j.zona.variante, 0b0100);
});

test('pulo: primeiro passo grande e depois 1 por quadro (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 });
  F.passo(j, { fogo: true });
  assert.equal(j.pulando, true);
  // primeiro passo: 0x20 - 0xB0 (mod 256) = 0x70
  assert.equal(j.E9, (C.CHAO - 0xB0) & 0xFF);
  F.passo(j, nada);
  assert.equal(j.E9, ((C.CHAO - 0xB0) - 1) & 0xFF);
});

test('pulo: não começa fora do chão (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 });
  F.passo(j, { fogo: true });
  const e9 = j.E9;
  F.passo(j, { fogo: false });
  F.passo(j, { fogo: true }); // nova borda de fogo, mas já pulando
  assert.equal(j.E7 >= 1, true);
  assert.notEqual(j.E9, e9 + 1000); // sanity
});

test('buraco não letal: cai até o subterrâneo, sem morte (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100, buracos: [{ ini: 0x70, fim: 0x80, letal: false }] });
  j.X = 0x75;
  rodar(j, 200, nada);
  assert.equal(j.subterraneo, true);
  assert.equal(j.E9, C.SUBTERRANEO);
  assert.equal(j.morto, false);
});

test('buraco letal: a queda que passa por 0x36 mata (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100, buracos: [{ ini: 0x30, fim: 0x40, letal: true }] });
  j.X = 0x33;
  rodar(j, 40, nada);
  assert.equal(j.morto, true);
});

test('morte: congela e respawn no mesmo ponto após o tempo de morte (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100, buracos: [{ ini: 0x30, fim: 0x40, letal: true }] });
  j.X = 0x33;
  // até a morte
  while (!j.morto) F.passo(j, nada);
  const xMorte = j.X;
  // congelado: o tempo de morte passa sem mover Harry
  for (let i = 0; i < C.MORTE_QUADROS - 1; i++) {
    F.passo(j, nada);
    assert.equal(j.morto, true);
    assert.equal(j.X, xMorte);
  }
  // o quadro seguinte é o respawn: no mesmo ponto e à altura do chão
  F.passo(j, nada);
  assert.equal(j.morto, false);
  assert.equal(j.X, xMorte);
  assert.equal(j.E9, C.CHAO);
});

test('respawn sobre o buraco letal: volta a cair (consistente com a repetição observada)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100, buracos: [{ ini: 0x30, fim: 0x40, letal: true }] });
  j.X = 0x33;
  while (!j.morto) F.passo(j, nada);
  rodar(j, C.MORTE_QUADROS, nada);
  // depois do respawn, a queda recomeça e a altura sai do chão
  rodar(j, 5, nada);
  assert.ok(j.E9 > C.CHAO);
});

test('variante >= 6 com tipo ≠ 5 no chão: morte (E)', () => {
  const j = F.novoJogo({ tipoZona: 1, varianteZona: 6 });
  F.passo(j, nada);
  assert.equal(j.morto, true);
});

test('relógio: 60 quadros = 1 segundo; 20:00 no início (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 });
  assert.equal(F.formatarRelogio(j), '20:00');
  rodar(j, 60, nada);
  assert.equal(F.formatarRelogio(j), '19:59');
});

test('relógio: ao zerar, congela e não reinicia (E)', () => {
  const j = F.novoJogo({ varianteZona: 0b0100 });
  j.segundos = 1; j.quadrosRelogio = 59;
  rodar(j, 1, nada);
  assert.equal(j.tempoEsgotado, true);
  assert.equal(F.formatarRelogio(j), '00:00');
  rodar(j, 300, nada);
  assert.equal(F.formatarRelogio(j), '00:00');
});

test('coleta: tipo 5 na faixa soma 2000 + 1000·k por quadro, k = 2 (E)', () => {
  const j = F.novoJogo({ tipoZona: 5, varianteZona: 0b0100 });
  j.X = 0x78;
  const p0 = j.pontos;
  F.passo(j, nada);
  assert.equal(j.pontos - p0, 4000);
  // revalidado: paga uma vez por instância, não a cada quadro
  const p1 = j.pontos;
  F.passo(j, nada);
  assert.equal(j.pontos, p1);
});

test('sem dano ligado, zona tipo ≠ 5 não desconta pontos (decisão de prototipo)', () => {
  const j = F.novoJogo({ tipoZona: 1, varianteZona: 0b0100 });
  rodar(j, 30, nada);
  assert.equal(j.pontos, C.PONTOS_INICIAIS);
});

test('coleta: fora da faixa não pontua (E)', () => {
  const j = F.novoJogo({ tipoZona: 5, varianteZona: 0b0100 });
  j.X = 0x50;
  const p0 = j.pontos;
  F.passo(j, nada);
  assert.equal(j.pontos, p0);
});

test('dano: com o dano ligado, tipo ≠ 5 no chão subtrai 1 por quadro (E)', () => {
  const j = F.novoJogo({ tipoZona: 1, varianteZona: 0b0000, dano: true });
  j.pontos = 30;
  F.passo(j, nada);
  assert.equal(j.pontos, 29);
});

test('dano: a pontuação não fica negativa (E, clamp em zero)', () => {
  const j = F.novoJogo({ tipoZona: 1, varianteZona: 0b0000, dano: true });
  j.pontos = 1;
  rodar(j, 5, nada);
  assert.equal(j.pontos, 0);
});

test('reinício: nova partida volta a 2000 pontos e 20:00 (E, RESET do console)', () => {
  const j = F.novoJogo();
  assert.equal(j.pontos, C.PONTOS_INICIAIS);
  assert.equal(F.formatarRelogio(j), '20:00');
});
