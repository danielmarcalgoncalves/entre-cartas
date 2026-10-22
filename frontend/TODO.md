# TODO — Entre Cartas

## 1. Base visual artesanal e identidade
- [x] A interface não deve parecer uma rede social, blog, plataforma de artigos, catálogo moderno em cards, SaaS, dashboard ou produto futurista.
- [x] A experiência deve combinar catálogo de cartas, scrapbook/junk journal, diário pessoal, caixa de memórias e arquivo de correspondências, evocando nostalgia, curiosidade, intimidade, melancolia, conforto e conexão humana.
- [x] Usar elementos de papel: papel envelhecido, rasgado, dobrado e amassado; folhas de caderno e de máquina de escrever; recortes de jornal; anotações manuscritas; adesivos; selos; carimbos; lacres de cera; washi tape; polaroids; cartões-postais; envelopes e pastas de arquivo.
- [x] Mostrar texturas, camadas, imperfeições e rotações sutis de aproximadamente 1–3 graus. Evitar glassmorphism, neumorphism, gradientes vibrantes, neon e alinhamento excessivamente perfeito.
- [x] Respeitar a paleta: fundos quentes #F4EFE6, #F8F1E5 e #EAD9B9; tinta #2B2B2B e #223A70; acentos #8B1E1E e #A52A2A, com outros tons suaves.
- [x] Usar Playfair Display ou Cormorant Garamond nos títulos; Inter ou Manrope na interface; Caveat, Patrick Hand ou Kalam nas cartas, sem prejudicar a legibilidade.
- [x] Implementar a base em React, Next.js e TypeScript, com Tailwind CSS e estrutura preparada para Framer Motion. GSAP, Howler.js e Matter.js são possibilidades futuras, não exigências desta primeira fase.

## 2. Homepage cinematográfica e descoberta por categorias
- [x] A homepage deve parecer a abertura de um livro de memórias, com uma grande folha de papel envelhecido ao centro e uma colagem física de fotografias antigas, flores, fragmentos de papel, selos, recortes de jornal, notas manuscritas, fita, adesivos e cartões-postais ao redor.
- [x] Exibir literalmente o título “Cartas para todos os sentimentos”, o subtítulo “Explore milhares de cartas reais, anônimas e inesquecíveis.” e o CTA “Abrir uma carta aleatória”.
- [x] O CTA aleatório deve abrir uma carta do conteúdo local demonstrativo.
- [x] Apresentar categorias como etiquetas de papel rasgado, cada uma com identidade visual própria: Amor, Saudade, Desabafos, Nunca Enviadas, Tristeza e Históricas. Incluir também os temas de corações partidos, confissões, pensamentos noturnos, lições de vida, cartas de família e histórias anônimas.
- [x] Permitir navegar entre Home, Descobrir/Catálogo, Detalhe/Leitura da carta, Favoritas e Coleções.

## 3. Catálogo e leitura de cartas
- [x] Representar correspondências como objetos físicos — envelopes, folhas dobradas, cartões-postais e cartas seladas ou amassadas — com variações visuais associadas às categorias; não usar cards modernos.
- [x] Implementar descoberta/catálogo com conteúdo inicial local e tipado para demonstrar cartas e categorias, adaptável posteriormente às referências de datasets Kaggle citadas no briefing.
- [x] A tela de leitura/detalhe deve parecer uma página de scrapbook, com o texto da carta legível sobre papel e decorações complementares como fita, flores, fotografias, selos, anotações, recortes e adesivos. A decoração não deve prejudicar a leitura.

## 4. Favoritas, arquivo e coleções
- [x] Não usar botões tradicionais de coração. Representar a ação de favoritar com carimbo vermelho aplicado diretamente ao papel e rótulos como “FAVORITA”, “ARQUIVADA” ou “GUARDADA”.
- [x] Disponibilizar estado de favoritas para as cartas e uma página de Favoritas.
- [x] Representar coleções como pastas físicas de arquivo, com textura e etiqueta; incluir estados visuais para salvar e organizar cartas e uma composição preparada para futuramente animar a entrada da carta na pasta.

## 5. Design system reutilizável e prontidão para interações físicas
- [x] Criar componentes reutilizáveis Plain Text, Paper, TornPaper, Envelope, LetterCard, LetterViewer, Folder, Stamp, Sticker, Tape, Polaroid, CategoryLabel, PaperTag, ScrapbookSection, NewspaperSnippet e WaxSeal.
- [x] Organizar a estrutura e os estados para futuras animações físicas: abrir envelope; puxar a carta para fora; desdobrar o papel e revelar o texto; impacto de carimbo; carta entrando na pasta e pasta fechando; amassar papel; jogar papel no lixo; reações sutis de adesivos.
- [x] Manter a primeira fase estática, sem depender de animações para completar as ações atuais; deixar os componentes e interações preparados para Framer Motion.
- [x] O resultado deve parecer abrir uma caixa esquecida cheia de cartas, fotografias, selos e memórias, despertando emoção antes da leitura.
