// Pitnew — física (protótipo, primeiro incremento).
// Regras confirmadas no emulador de análise (ver especificacao-pwa.md). Implementação própria, em
// unidades de posição e altura iguais às observadas, para que os testes possam usar as medições como oráculo.
// Não contém código, tabelas ou gráficos do original. Sem dependências; roda no Node e no navegador.
(function (raiz) {
  'use strict';

  const X_MIN = 0x08, X_MAX = 0x94;          // bordas horizontais observadas
  const CHAO = 0x20, SUBTERRANEO = 0x56;     // alturas: solo e nível subterrâneo
  const ALTURA_MORTE = 0x36;                 // queda que passa por aqui mata (no buraco letal)
  const FAIXA_COLETA = [0x78, 0x7E];         // revalidado (emulador corrigido): faixa em que o tipo 5 paga
  const PASSOS_PULO = [0xB0].concat(Array(31).fill(0x01)); // passo inicial grande, depois 1 por quadro
  const QUADROS_POR_SEGUNDO = 60;
  const MORTE_QUADROS = 132;                 // congelamento após morte (observado)
  const PONTOS_INICIAIS = 2000;
  const CIPO_X = [0x44, 0x52];               // faixa de X de captura (F858: (X - 0x44) < 0x0F)
  const CIPO_EC_INICIO = 0x0C, CIPO_EC_FIM = 0x16; // fase da captura (F87C e F8…: EC 0x0C → 0x16)
  const CIPO_QUADROS_PASSO = 9;              // medido: EC sobe 1 a cada 9 quadros
  const CIPO_X_FIXO = 0x4C;
  const CIPO_EC_MIN = 0x0B;                  // medido: subir para em EC = 0x0B
  const CIPO_ENTRADA_SUBTERRANEO = 0x15;     // medido: agarrar do subterrâneo começa em EC = 0x15                  // X fica em 0x4C durante a captura (F880)

  // Estado inicial de uma partida.
  function novoJogo(opcoes) {
    const o = opcoes || {};
    return {
      X: 0x10, E9: CHAO, E7: 0, pulando: false, caindo: false,
      subterraneo: false, morto: false, mortoQuadros: 0,
      zona: { tipo: o.tipoZona === undefined ? 0 : o.tipoZona, variante: o.varianteZona === undefined ? 0 : o.varianteZona, cipo: !!o.cipo },
      buracos: o.buracos || [],                // [{ini, fim, letal}] em X, na zona atual
      pontos: PONTOS_INICIAIS,
      segundos: 20 * 60, quadrosRelogio: 0,    // 20:00 de relógio regressivo
      tempoEsgotado: false,
      quadro: 0,
      _fogoAnt: false,
      _k: 2,                                    // k do tipo 5 (medido: 0x93 & 3 = 2)
      coletado: false,                          // revalidado: o objeto paga uma vez por instância de zona
      cipo: !!o.cipo,                           // zona com cipó (9D ≠ 0)
      capturado: false, ec: 0, quadroEc: 0,      // captura no cipó (fase EC)
      dano: !!o.dano,                           // dano contínuo (armadilha observada); desligado por padrão
      faixaColeta: o.faixaColeta || FAIXA_COLETA, // faixa de X da coleta (por cenário; padrão = medida)
      travaEm: o.travaEm || null,                // faixa de X onde a armadilha trava (null = zona inteira com bit 2 limpo)
    };
  }

  function noChao(j) { return !j.pulando && !j.caindo && !j.subterraneo && !j.morto; }

  // Controle travado: no chão, com variante de bit 2 limpo, o joystick é ignorado (observado).
  function travado(j) {
    if (!noChao(j) || (j.zona.variante & 4) !== 0) return false;
    return !j.travaEm || (j.X >= j.travaEm[0] && j.X <= j.travaEm[1]);
  }

  function emBuraco(j) {
    return j.buracos.find((b) => j.X >= b.ini && j.X <= b.fim);
  }

  // Avança um quadro. entrada = { direita, esquerda, fogo } (booleanos). sorteio() devolve {tipo, variante}.
  function passo(j, entrada, sorteio) {
    const e = entrada || {};
    j.quadro++;

    // Morte: congelado até o fim do tempo de morte, depois respawn no mesmo ponto (observado).
    if (j.morto) {
      j.mortoQuadros++;
      if (j.mortoQuadros >= MORTE_QUADROS) { j.morto = false; j.mortoQuadros = 0; j.E9 = CHAO; j.E7 = 0; j.pulando = false; j.caindo = false; j.subterraneo = false; }
      relogio(j);
      return j;
    }

    // Cipó: a manete controla a fase EC. Para baixo desce (EC +1 a cada 9 quadros, primeiro passo em 2);
    // para cima sobe (EC -1, até 0x0B); direita, esquerda ou parado não mudam nada (medido).
    // Ao chegar a 0x16, cai no subterrâneo (medido).
    if (j.capturado) {
      const sobe = !!e.cima, desce = !!e.baixo && !e.cima;
      if (sobe || desce) j.quadroEc++;
      if (j.quadroEc >= CIPO_QUADROS_PASSO) {
        j.quadroEc = 0;
        j.ec = desce ? j.ec + 1 : Math.max(CIPO_EC_MIN, j.ec - 1);
        j.E9 = 0x32 + 4 * (j.ec - CIPO_EC_INICIO); // altura medida: 0x32 + 4 por fase
        if (j.ec >= CIPO_EC_FIM) { j.capturado = false; j.subterraneo = true; j.E9 = SUBTERRANEO; j.ec = 0; }
      }
      pontuar(j);
      relogio(j);
      return j;
    }
    // Entrada no cipó: do chão, pela manete para baixo; do subterrâneo, pela manete para cima (medido).
    if (j.zona.cipo && j.X >= CIPO_X[0] && j.X <= CIPO_X[1]) {
      if (noChao(j) && j.E9 === CHAO && !!e.baixo) {
        j.capturado = true; j.ec = CIPO_EC_INICIO; j.quadroEc = CIPO_QUADROS_PASSO - 2; j.X = CIPO_X_FIXO; j.E9 = 0x32;
        relogio(j);
        return j;
      }
      if (j.subterraneo && !!e.cima) {
        j.subterraneo = false; j.capturado = true; j.ec = CIPO_ENTRADA_SUBTERRANEO; j.quadroEc = CIPO_QUADROS_PASSO - 3;
        j.X = CIPO_X_FIXO; j.E9 = SUBTERRANEO;
        relogio(j);
        return j;
      }
    }

    // Entrada efetiva: travado ignora o joystick.
    const dir = travado(j) ? { direita: false, esquerda: false } : { direita: !!e.direita, esquerda: !!e.esquerda };
    const fogoBorda = !!e.fogo && !j._fogoAnt;
    j._fogoAnt = !!e.fogo;

    // Horizontal: só em quadros pares, 1 pixel por passo (observado com a direita).
    if (j.quadro % 2 === 0 && !j.pulando && !j.caindo) {
      if (dir.direita) { j.X += 1; }
      else if (dir.esquerda) { j.X -= 1; }
    }
    if (j.X > X_MAX) { // borda direita: nova zona (sorteio), X volta a 0x08
      j.X = X_MIN;
      if (sorteio) { const z = sorteio(); j.zona = { tipo: z.tipo, variante: z.variante, cipo: !!z.cipo }; }
      j.buracos = [];
    } else if (j.X < X_MIN) { // borda esquerda: X vai a 0x94, zona não muda (observado)
      j.X = X_MAX;
    }

    // Pulo: começa na borda do fogo, no chão.
    if (fogoBorda && noChao(j)) { j.pulando = true; j.E7 = 0; }

    if (j.pulando) {
      j.E9 = (j.E9 - PASSOS_PULO[j.E7]) & 0xFF;
      j.E7++;
      if (j.E7 >= PASSOS_PULO.length) { j.pulando = false; j.E7 = 0; j.E9 = CHAO; }
    }

    // Buraco: no chão, ao cruzar um buraco, cai (altura sobe 1 por quadro).
    if (noChao(j) && emBuraco(j)) { j.caindo = true; j.buracoAtual = emBuraco(j); }
    if (j.caindo) {
      j.E9 += 1;
      if (j.buracoAtual && j.buracoAtual.letal && j.E9 === ALTURA_MORTE) { morrer(j); relogio(j); return j; }
      if (j.E9 >= SUBTERRANEO) { j.caindo = false; j.subterraneo = true; j.E9 = SUBTERRANEO; }
    }

    // Subterrâneo: o personagem anda, sem morte (observado).
    // Morte por tipo/variante da zona, no chão (observado: variante >= 6 e tipo ≠ 5 mata).
    if (noChao(j) && j.zona.variante >= 6 && j.zona.tipo !== 5) { morrer(j); relogio(j); return j; }

    pontuar(j);
    relogio(j);
    return j;
  }

  function morrer(j) { j.morto = true; j.mortoQuadros = 0; j.pulando = false; j.caindo = false; j.subterraneo = false; }

  // Pontuação por quadro: coleta (tipo 5 na faixa) soma; dano (tipo ≠ 5, no chão) subtrai 1 (observado).
  function pontuar(j) {
    if (j.zona.tipo === 5 && !j.coletado && j.X >= j.faixaColeta[0] && j.X <= j.faixaColeta[1] && noChao(j)) {
      j.pontos += 2000 + 1000 * j._k;
      j.coletado = true;
    } else if (j.dano && j.zona.tipo !== 5 && noChao(j) && j.pontos > 0) {
      j.pontos -= 1;
    }
    if (j.pontos < 0) j.pontos = 0;
  }

  // Relógio regressivo: 1 segundo a cada 60 quadros. Ao zerar, o jogo congela (não reinicia) (observado).
  function relogio(j) {
    if (j.tempoEsgotado) return;
    j.quadrosRelogio++;
    if (j.quadrosRelogio >= QUADROS_POR_SEGUNDO) {
      j.quadrosRelogio = 0;
      j.segundos -= 1;
      if (j.segundos <= 0) { j.segundos = 0; j.tempoEsgotado = true; }
    }
  }

  function formatarRelogio(j) {
    const m = Math.floor(j.segundos / 60), s = j.segundos % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

const API = { novoJogo, passo, formatarRelogio, constantes: { X_MIN, X_MAX, CHAO, SUBTERRANEO, ALTURA_MORTE, FAIXA_COLETA, MORTE_QUADROS, PONTOS_INICIAIS, CIPO_X, CIPO_X_FIXO, CIPO_EC_INICIO, CIPO_EC_FIM, CIPO_EC_MIN, CIPO_ENTRADA_SUBTERRANEO, CIPO_QUADROS_PASSO } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Fisica = API;
})(typeof self !== 'undefined' ? self : this);
