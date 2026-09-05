# Prompt de Criação e Escopo de Projeto: Sistema de Cardápio WebAR para Restaurantes

## Objetivo
Criar um sistema de cardápio digital web-based (sem necessidade de download de aplicativo) que permita aos clientes visualizarem pratos e bebidas em Realidade Aumentada (3D) diretamente em suas mesas, em escala 1:1. O sistema deve contemplar toda a jornada, desde a leitura do QR Code, exploração do cardápio híbrido (2D/3D), personalização de ingredientes em tempo real, até o fechamento da conta multiplayer.

---

## FASE 1: A Experiência do Cliente (UX/UI & Jornada)
A jornada do usuário deve ser "frictionless" (sem atritos), dividida nas seguintes etapas:

1. **Acesso Instantâneo e Contexto:** 
   - Leitura de QR Code físico na mesa (ex: `app.com/restaurante/mesa/12`).
   - Carregamento imediato da interface 2D leve. Permissão de câmera solicitada apenas no momento de uso da funcionalidade AR.
2. **Exploração (Interface Híbrida):** 
   - Navegação similar a apps de delivery. 
   - Itens com modelo 3D disponível possuem um ícone indicativo (ex: "Ver na minha mesa"). 
   - O arquivo 3D faz pre-loading em background ao abrir os detalhes do prato.
3. **Experiência AR (O Momento "Uau"):** 
   - Guia visual (SLAM) instruindo a mapear a mesa. 
   - O prato surge ancorado na mesa em escala real (1:1). 
   - Controles na tela: Rotação, Raio-X Nutricional (tags 3D) e botão de Fotografia com marca d'água do restaurante.
4. **Personalização Dinâmica:** 
   - Bottom sheet com opções de modificadores. 
   - Ao adicionar ou remover ingredientes, o modelo 3D atualiza instantaneamente na mesa (ex: tira o picles, adiciona bacon). O preço é atualizado simultaneamente.
5. **Checkout Colaborativo:** 
   - Carrinho compartilhado entre todos que escanearam o QR Code da mesa. 
   - Envio direto de pedidos para a cozinha (integração futura com PDV). 
   - Divisão de conta por pessoa ou item e pagamento nativo web (Pix, Apple Pay, Google Pay).

---

## FASE 2: Arquitetura de Dados e Integração 3D
O banco de dados relacional (PostgreSQL) deve integrar os dados do cardápio com as malhas (meshes) dos arquivos 3D hospedados em nuvem (S3/GCS).

**Estrutura Principal:**
* `restaurants` e `categories`: Dados básicos.
* `menu_items`: Informações do prato, preços base, estoque.

**Gestão de Ativos 3D:**
* `menu_item_assets`:
  * URL Web/Android (`.glb` / `.gltf`)
  * URL iOS (`.usdz`)
  * `scale_factor` (ajuste fino de proporção)
  * `lighting_preset` (iluminação otimizada para o tipo de comida)

**Motor de Personalização 3D:**
* `modifier_groups` (ex: "Ingredientes Extras") e `modifier_options` (ex: "Bacon").
* **O Segredo:** Cada `modifier_option` deve ter uma coluna `mesh_node_name` (nome da camada dentro do modelo 3D) e `3d_action` (`show`/`hide`). Isso vincula o clique no HTML à ação no renderizador 3D.

---

## FASE 3: Stack Tecnológico Recomendado
* **Front-end Web & UI:** React.js / Next.js (para SEO dos restaurantes e carregamento rápido).
* **Renderização 3D:** 
  - `<model-viewer>` (Google) para o MVP rápido.
  - Three.js + React Three Fiber (R3F) para controle total das animações de ingredientes e shaders avançados.
* **Motor de AR (SLAM):** WebXR API (padrão) com fallback para Scene Viewer/Quick Look, ou bibliotecas como 8th Wall (se houver orçamento para SLA superior no iOS).
* **Back-end:** Node.js (Nest/Express) ou Python (FastAPI).
* **Banco de Dados & Storage:** PostgreSQL + AWS S3 (ou equivalente) para os pesados arquivos `.glb` e `.usdz`.

---

## FASE 4: Criação e Gestão de Modelos 3D (Back-office)
Como os restaurantes alimentarão o sistema com pratos em 3D:
1. **Fotogrametria Mobile:** Integração ou instrução para uso de apps baseados em LiDAR (iPhones Pro) ou nuvem (ex: Polycam, Luma AI, RealityCapture). O restaurante grava um vídeo/fotos do prato e a nuvem gera a malha 3D.
2. **Setup Físico (Opcional):** Sugerir o uso de "Caixas de Luz" (Lightbox) portáteis com prato giratório para garantir iluminação difusa, essencial para boas texturas.
3. **Pipeline de Conversão:** O painel do restaurante deve aceitar uploads automáticos e converter os arquivos garantindo otimização de polígonos (reduzir o peso para rodar liso no 4G).
4. **Visão de Futuro (NeRFs / Gaussian Splatting):** Arquitetura preparada para suportar essas tecnologias de renderização baseada em IA assim que se tornarem mais viáveis para browsers móveis, garantindo texturas hiper-realistas para líquidos e reflexos.

---

## FASE 5: Restrições e Pontos de Atenção (Gargalos)
* **Performance:** Modelos 3D precisam ser dizimados (baixa contagem de polígonos, max 10-15MB) com texturas assadas (baked textures) para não superaquecer celulares ou gastar toda a bateria.
* **Iluminação:** A iluminação virtual (HDRI) do modelo precisa parecer natural para não gerar o efeito de "comida de plástico".
* **Acessibilidade Web:** O fallback 2D deve ser perfeito. Se o celular for antigo ou não tiver suporte a AR, a experiência de compra via fotos normais não pode ser prejudicada.
