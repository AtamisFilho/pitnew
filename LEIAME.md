# Pitnew — protótipo de física (primeiro incremento)

Status: **protótipo.** Não é o produto final: não tem cenário original, vidas, fim de jogo pelo jogo nem arte.

## O que está aqui
- `fisica.js`: regras de física, relógio, pontuação e reinício. Sem dependências; roda no Node e no navegador.
- `fisica.test.js`: 20 testes (`node --test fisica.test.js`). Cada teste cita a medição que usa como oráculo (E).
- `index.html`: página para ver o protótipo. Abre direto do disco (sem servidor). Arte provisória (retângulos).

## O que é confirmado e está implementado (E)
- Movimento horizontal de 1 posição a cada 2 quadros com a direita.
- Zona com variante de bit 2 limpo: joystick ignorado no chão (armadilha).
- Bordas: direita troca de zona (nova instância sorteada); esquerda não troca.
- Pulo: primeiro passo grande, depois 1 por quadro.
- Buraco não letal: queda até o subterrâneo, sem morte.
- Buraco letal: a queda que passa por 0x36 mata; respawn no mesmo ponto após 132 quadros.
- Variante ≥ 6 com tipo ≠ 5 no chão: morte.
- Relógio: 20:00, 60 quadros por segundo; ao zerar, congela (não reinicia).
- Coleta: tipo 5 na faixa 0x76–0x82 soma 2000 + 1000·k por quadro (k = 2 medido).
- Reinício: pontuação 2000 e relógio 20:00.

## O que é aproximação (C, não confirmado) — marcado no código
- **Dano contínuo (−1 por quadro):** só com `dano: true`. No original, foi medido na armadilha (bit 7 de COLUP1 ligado); a condição geral não foi fechada. Por padrão, desligado.
- **Altura do pulo:** o perfil de passos é uma aproximação do observado; o pouso no chão é simplificado.
- **Buracos:** posições são fornecidas pelo chamador. O original os define pela tabela de zona (não reproduzido).

## Diferença conhecida com o original
- **Repetição da morte:** no original, a morte no mesmo ponto se repete a cada ~280 quadros (medido, 276–287). No protótipo, o ciclo é ~154 quadros (132 de morte + ~22 de queda). A causa não está fechada; provavelmente há um tempo de respawn ou de queda não modelado.

## Fora do protótipo (lacunas declaradas)
- Vidas e fim de jogo pelo jogo (não observados).
- Morte por cipó (não observada). Cipó e captura: não implementados.
- Layout de telas (kernel procedural, não reproduzido) e paleta (sem referência NTSC).
- Coleta: o fim da coleta e se o objeto some (não observado).

## Clean-room
Nenhum código, tabela de gráfico, glifo, som ou nome do original. A ROM não é lida em runtime nem embutida. As constantes são medições de comportamento, não cópias do código.

## Cenários (segundo incremento)
- `cenarios.js`: catálogo com **só** o que foi medido em posição, cada item com a evidência (E). Cinco cenários: zona de coleta (tipo 5), dois buracos letais (X 0x33 e 0x4D), um buraco não letal (X 0x77) e a armadilha de dano (X 0x3A).
- `cenarios.test.js`: 6 testes, um por cenário, reproduzindo o evento medido.
- `index.html`: seletor de cenário. Os retângulos continuam sendo arte provisória.

## O que o cenário NÃO é
- **Não é o layout original.** O original gera as telas linha a linha no kernel (procedural), e essa reconstrução não está fechada. Os buracos e objetos listados são só as posições medidas, e a zona de origem de cada buraco não foi registrada.
- **Cipó não está implementado.** A captura e a descida foram observadas, mas não entram no protótipo.
- **Vidas e fim de jogo pelo jogo** continuam não observados.

## Próximo passo para aproximar do original
Fechar o layout das telas (kernel R1–R5) e registrar, para cada buraco e objeto medido, a zona de origem. Sem isso, o cenário não reproduz as telas originais.

## Cipó (terceiro incremento)
- Implementado: captura no chão, em X entre 0x44 e 0x52, com a manete para baixo e zona com cipó. Durante a captura, X fica em 0x4C; a fase EC sobe a cada 9 quadros de 0x0C a 0x16; a altura segue 0x32 + 4·(EC − 0x0C); ao fim, desce ao subterrâneo (0x56), sem morte. Tudo medido (E).
- Testes: `cipo.test.js`. Cenário `cipo-0x4c` no seletor.
- A manete controla a captura (E): para baixo desce (EC +1 a cada 9 quadros); para cima sobe (EC -1, piso 0x0B); direita, esquerda e parado não mudam nada.
- Segunda via (E): do subterrâneo, com a manete para cima, agarra em EC = 0x15 e sobe.
- Lacuna (E): numa corrida, a captura soltou em EC = 0x10 com a manete para baixo; a causa não foi identificada e não está implementada.

## Cipó (terceiro incremento)
- Implementado: captura no chão, em X entre 0x44 e 0x52, com a manete para baixo e zona com cipó. Durante a captura, X fica em 0x4C; a fase EC sobe a cada 9 quadros de 0x0C a 0x16; a altura segue 0x32 + 4·(EC − 0x0C); ao fim, desce ao subterrâneo (0x56), sem morte. Tudo medido (E).
- Testes: `cipo.test.js`. Cenário `cipo-0x4c` no seletor. Seta para baixo na página.
- Simplificação declarada (C): a manete é ignorada durante a captura. O efeito de soltar antes do fim não foi medido.
- Não implementado (lacuna): a segunda via de captura pelo subterrâneo (E9 ≥ 0x54 com a manete para cima, EC = 0x15), que solta quase na hora. Não foi observada.

## AVISO: valores provisórios
Uma correção no emulador de análise (leituras de dado da ROM) mostrou que várias medições usadas para os cenários e os testes podem estar erradas: posições de buracos, faixa de coleta, posição da captura no cipó e posição da armadilha. Os testes codificam esses valores e devem ser revalidados antes de se confiar neles. Ver `especificacao-kernel.md`, seção "CORREÇÃO CRÍTICA".

## Revalidação (emulador corrigido)
- Coleta: faixa 0x78–0x7E, +4000 uma vez por instância (revalidado).
- Cipó: captura **não reproduzida** com o emulador corrigido (Harry cai em todas as posições testadas). A captura descrita antes dependia do bug. O cenário cipo-0x4c fica como referência, não como fato.
