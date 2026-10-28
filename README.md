# Pitnew — protótipo (v0.1.0)

Reescrita independente (clean-room) das regras de física de um jogo clássico de Atari 2600, em JavaScript puro, para rodar no navegador (PWA futura).

**Status: protótipo.** Não é o produto final. Não há arte original, cenário completo, vidas nem fim de jogo pelo jogo.

## Como usar

- Abrir `index.html` no navegador (funciona direto do disco, sem servidor).
- Seta direita/esquerda: andar. Espaço ou Z: fogo (pulo). Seta para baixo: manete para baixo (captura no cipó). R: reiniciar.
- A manete para cima não está mapeada na página (existe na física e nos testes).
- Seletor de cenário: zona de coleta, buracos, cipó e armadilha.

## Como testar

```
node --test
```

37 testes (Node 18+, sem dependências). Cada teste cita a medição que usa como referência.

## Arquivos

- `fisica.js`: regras de física, relógio, pontuação, pulo, buracos e cipó. Roda no Node e no navegador.
- `cenarios.js`: catálogo de cenários. Cada item tem o status da evidência.
- `index.html`: página do protótipo. Arte provisória (retângulos).
- `*.test.js`: testes.
- `LEIAME.md`: estado técnico detalhado: o que está confirmado, o que é aproximação e o que não foi reproduzido.

## Clean-room

Nenhum código, tabela, gráfico, som ou nome do original foi copiado. A ROM não é lida em tempo de execução nem embutida. As constantes são medições de comportamento.

## Limitações conhecidas

Ver `LEIAME.md`. Resumo:
- Captura no cipó: não reproduzida com a versão corrigida da ferramenta de análise. Mantida só como mecânica do protótipo.
- Buracos e armadilha: parte das posições não foi reproduzida; a revalidação completa está pendente.
- Layout das telas, vidas, fim de jogo e morte por cipó: não fechados.
- Paleta de cores: sem referência externa.

## Licença

A definir pelo autor.
