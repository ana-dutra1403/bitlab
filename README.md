# DesmontAR

Jogo educacional de realidade aumentada (WebAR) para estudar hardware. O jogador ensaia a montagem de um computador sobre um marcador impresso e depois pendura obras de Monet nas paredes da sala com AR sem marcador. No fim, atravessa um portal para uma galeria em realidade virtual.

**Equipe:** Ana Luísa, Ana Roberta, Giovanna e Luiza (UFPB, Centro de Informática)

## Links

- Jogo: https://ana-dutra1403.github.io/desmontAR/atelie.html
- Instruções: https://ana-dutra1403.github.io/desmontAR/instrucoes.html

## Onde está cada parte do código

| Arquivo | O que tem |
|---|---|
| `atelie.html` | Estrutura da página, estilos (CSS) e telas: início, regras, painel e mensagens |
| `js/jogo.js` | Toda a lógica do jogo (detalhes abaixo) |
| `js/aruco.js` | Visão computacional de base: tons de cinza, limiarização, contornos e quadriláteros. Baseado em js-aruco2 (licença MIT) |
| `js/dados.js` | Só dados: imagens das obras e das guias em base64. Não tem lógica |
| `instrucoes.html` | Página de instruções do jogo |

### Partes principais de `js/jogo.js`

- **Cena 3D:** usa three.js r128. Tem a placa-mãe, as peças, o gabinete e o portal.
- **Fases de montagem:**
  - processador e pasta térmica;
  - memória RAM e placa de vídeo;
  - escolha da fonte.
- **Módulo `CAM` (AR com marcador):**
  - abre a câmera com `getUserMedia`;
  - encontra quadriláteros na imagem;
  - lê o padrão de bits 8×8 do marcador nas 4 rotações;
  - refina os cantos;
  - calcula a pose da câmera por homografia, com suavização.
- **Fase das paredes (`PW`, AR sem marcador):**
  - conta pontos de textura reais na imagem da câmera;
  - cria um plano de parede a 1,5 m;
  - pendura as obras onde a mira cruza esse plano.
- **Galeria em RV:**
  - sala 360° guiada pelo giroscópio (`DeviceOrientation`);
  - nessa parte, a câmera fica desligada.

## Como rodar

- Abra `atelie.html` num navegador.
  - Para usar a câmera, a página precisa estar em HTTPS, como no GitHub Pages.
  - Sem câmera, use o botão "Jogar sem câmera (simulação)".
- Precisa de internet para carregar o three.js.

## Créditos

- Obras de Claude Monet: domínio público.
- js-aruco2: licença MIT.
- three.js: licença MIT.
