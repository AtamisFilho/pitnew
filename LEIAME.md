# Pitnew — estado técnico do protótipo (v0.1.0)

Este arquivo lista o que foi medido, o que é aproximação e o que não foi reproduzido. A convenção é:

- **(E)**: medido no emulador de análise, com a versão corrigida.
- **(C)**: inferido do código ou aproximação do protótipo; não medido.
- **NÃO REPRODUZIDO**: medido antes da correção do emulador e não reproduzido depois dela.

## Correção do emulador (leia primeiro)

Uma correção no emulador de análise (leitura de dado da ROM) mostrou que várias medições anteriores estavam erradas. O bug fazia endereços de ROM com o bit 7 ligado serem lidos da RAM. As medições afetadas foram revalidadas ou marcadas. Detalhes em `especificacao-kernel.md`, seção "CORREÇÃO CRÍTICA".

## Física (`fisica.js`)

| Regra | Status | Observação |
|---|---|---|
| Andar: 1 posição a cada 2 quadros, com a direita | (E) | |
| Bordas: direita troca de zona (sorteio); esquerda não troca | (E) | X mínimo 0x08, máximo 0x94 |
| Zona com variante de bit 2 limpo: joystick ignorado no chão | (E) | Armadilha, ver cenários |
| Pulo: primeiro passo grande (0xB0), depois 1 por quadro | (E) | Decaimento de −1 por quadro confirmado; o primeiro passo (0xB0) não foi revalidado com o emulador corrigido |
| Buraco não letal: queda até o subterrâneo (0x56), sem morte | (E) | |
| Buraco letal: a queda que passa por 0x36 mata | (E) | |
| Morte: congela 132 quadros e respawn no mesmo ponto | (E) | |
| Morte: variante ≥ 6 com tipo ≠ 5 no chão | (E) | |
| Relógio: 20:00, 60 quadros por segundo, congela ao zerar | (E) | |
| Reinício: pontuação 2000 | (E) | RESET do console |
| Coleta (tipo 5): +2000 + 1000·k, uma vez por instância, k = 2 | (E) | Faixa X 0x78–0x7E (revalidado) |
| Dano (tipo ≠ 5, no chão): −1 por quadro | (C) | Só com `dano: true`; medido na armadilha antes da correção, não revalidado |

**Diferença conhecida com o original:** a morte no mesmo ponto se repete a cada ~280 quadros no original (medido 276–287). No protótipo, o ciclo é ~154 quadros. A causa não está fechada.

## Cipó (`fisica.js`, `cipo.test.js`)

- A **captura no cipó não foi reproduzida** com o emulador corrigido. Com ele, Harry cai em X 0x44–0x52 em todas as variantes testadas (0x93 = 0 a 7). A medição antiga (captura em X 0x4C) dependia do bug.
- A mecânica abaixo é do protótipo, a partir da medição antiga. Está marcada como **NÃO REPRODUZIDO** no cenário `cipo-0x4c`:
  - captura no chão com a manete para baixo, X entre 0x44 e 0x52, zona com cipó;
  - X fica em 0x4C; fase EC sobe 1 a cada 9 quadros, de 0x0C a 0x16; altura 0x32 + 4·(EC − 0x0C);
  - ao chegar a EC = 0x16, desce ao subterrâneo (0x56), sem morte;
  - manete para cima: EC −1, com piso em 0x0B; do subterrâneo, agarra em EC = 0x15.
- **Lacunas (E, não implementadas):** soltura antes de EC = 0x16, observada numa corrida com causa não identificada; morte por cipó, não observada.

## Cenários (`cenarios.js`, `cenarios.test.js`)

| Cenário | Status | Observação |
|---|---|---|
| `coleta-tipo-5` | (E) | Revalidado: faixa 0x78–0x7E |
| `buraco-letal-0x33` | NÃO REPRODUZIDO | Sem morte em X 0x33 na zona testada |
| `buraco-letal-0x4d` | PARCIAL | Morte em todo X de 0x40 a 0x59 (inclusive 0x4D), na zona testada |
| `buraco-nao-letal-0x77` | NÃO REPRODUZIDO | Sem queda em X 0x74–0x7A na zona testada |
| `cipo-0x4c` | NÃO REPRODUZIDO | Ver seção Cipó |
| `armadilha-0x3a` | NÃO REVALIDADO | Não chegou a X 0x3A travado pela caminhada natural |

A zona de origem de cada buraco não foi registrada no original. Os resultados de revalidação valem só para a zona tipo 5 testada.

## Fora do protótipo (lacunas declaradas)

- Layout das telas: a regra de R1 é conhecida (valores `F3EF[X]`), mas o mapa linha → escritor de uma tela inteira não está fechado.
- Vidas e fim de jogo pelo jogo: não observados. O único reinício medido é o RESET.
- Morte por cipó: não observada.
- Paleta de cores: sem referência NTSC externa.
- Arte: retângulos provisórios.

## Clean-room

Nenhum código, tabela de gráfico, glifo, som ou nome do original foi copiado. A ROM não é lida em tempo de execução nem embutida. As constantes são medições de comportamento.
