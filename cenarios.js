// Pitnew — catálogo de cenários de teste (buracos e objetos observados no original).
// Cada elemento tem a evidência da medição (E). Só entra o que foi medido em posição.
// Não é o layout completo do original: o layout das telas é procedural e não foi reconstruído.
// Não contém código, tabelas ou gráficos do original.
(function (raiz) {
  'use strict';

  const CENARIOS = [
    {
      id: 'coleta-tipo-5',
      nome: 'Zona de coleta (tipo 5)',
      evidencia: 'E: (revalidado com o emulador corrigido) zona tipo 5 em EB = 0; paga +4000 uma vez, em X = 0x78–0x7E (estado novo por posição).',
      zona: { tipo: 5, variante: 0b0100 },
      buracos: [],
      coleta: [0x78, 0x7E],
    },
    {
      id: 'buraco-letal-0x33',
      status: 'nao-reproduzido',
      nome: 'Buraco letal (X 0x33)',
      evidencia: 'NÃO REPRODUZIDO na zona testada.' + ' REVALIDAÇÃO (emulador corrigido, zona tipo 5, variantes 0x93 = 0..7): ' + 'sem morte em X = 0x33 (E9 para em 0x33). Medição anterior ao bug: morte em X = 0x33, zona de origem não registrada.',
      zona: { tipo: 0, variante: 0b0100 },
      buracos: [{ ini: 0x30, fim: 0x36, letal: true }],
    },
    {
      id: 'buraco-letal-0x4d',
      status: 'parcial',
      nome: 'Buraco letal (X 0x4D)',
      evidencia: 'PARCIAL.' + ' REVALIDAÇÃO (emulador corrigido, zona tipo 5, variantes 0x93 = 0..7): ' + 'morte em todo X de 0x40 a 0x59 (inclusive 0x4D), não só em 0x4D. Medição anterior ao bug: morte só em 0x4D; zona de origem não registrada.',
      zona: { tipo: 0, variante: 0b0100 },
      buracos: [{ ini: 0x4B, fim: 0x4D, letal: true }],
    },
    {
      id: 'buraco-nao-letal-0x77',
      status: 'nao-reproduzido',
      nome: 'Buraco não letal (X 0x77)',
      evidencia: 'NÃO REPRODUZIDO na zona testada.' + ' REVALIDAÇÃO (emulador corrigido, zona tipo 5, variantes 0x93 = 0..7): ' + 'sem queda em X 0x74–0x7A (E9 fica em 0x20). Medição anterior ao bug: queda até 0x56 em X = 0x77; zona de origem não registrada.',
      zona: { tipo: 0, variante: 0b0100 },
      buracos: [{ ini: 0x74, fim: 0x7A, letal: false }],
    },
    {
      id: 'cipo-0x4c',
      nome: 'Cipó (captura em X 0x4C)',
      evidencia: 'NÃO REPRODUZIDO com o emulador corrigido. Medido antes da correção (dread): captura em X = 0x4C; EC 0x0C→0x16 a cada 9 quadros; altura 0x32 + 4·(EC−0x0C). Com o emulador corrigido, Harry cai em X 0x44–0x52 (todas as variantes 0x93 = 0..7). Mecânica do protótipo, não fato.',
      status: 'nao-reproduzido', // medido antes da correção; o emulador corrigido não reproduz
      zona: { tipo: 0, variante: 0b0100, cipo: true },
      buracos: [],
      cipo: true,
    },
    {
      id: 'armadilha-0x3a',
      status: 'nao-revalidado',
      nome: 'Armadilha de dano (X 0x3A)',
      evidencia: 'NÃO REVALIDADO.' + ' Com o emulador corrigido, a caminhada natural não chegou a X = 0x3A travado em 4000 quadros; forçar tipo 1 na RAM deu resultado inconsistente (X saltou para 0x49), então o teste não é válido. Medição anterior ao bug: travamento em X = 0x3A, -1 ponto por quadro.',
      zona: { tipo: 1, variante: 0b0000 },
      buracos: [],
      dano: true,
      travaEm: [0x3A, 0x3A],
    },
  ];

  // Lacunas declaradas: o original tem, mas nenhum cenário acima reproduz ainda.
  const LACUNAS = [
    'Cipó: soltura antes de EC = 0x16 observada numa corrida (E, causa não identificada; não implementada). O piso de subida (EC = 0x0B) foi medido numa só corrida.',
    'Demais buracos e objetos das telas: o layout é procedural no kernel e não foi reconstruído.',
    'Posições de buracos por zona: só as posições medidas acima; a zona de origem de cada uma não foi registrada.',
    'Vidas e fim de jogo pelo jogo: não observados.',
  ];

  function criarJogo(F, cenario) {
    return F.novoJogo({
      tipoZona: cenario.zona.tipo,
      varianteZona: cenario.zona.variante,
      buracos: cenario.buracos,
      dano: !!cenario.dano,
      faixaColeta: cenario.coleta,
      travaEm: cenario.travaEm,
      cipo: !!cenario.cipo || !!cenario.zona.cipo,
    });
  }

  const API = { CENARIOS, LACUNAS, criarJogo };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Cenarios = API;
})(typeof self !== 'undefined' ? self : this);
