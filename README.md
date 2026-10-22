# 💌 Entre Cartas

> 🎓 Projeto desenvolvido por **Daniel Marçal Gonçalves** para a disciplina de **Introdução à Computação em Nuvem (ISW055)** lecionada pelo professor **[@siriani](https://github.com/siriani)** (Fatec Pompeia).
>
> 📌 **Continuidade de Projeto:** Este repositório é o fork oficial evolutivo da arquitetura anterior ([filmecc](https://github.com/danielmarcalgoncalves/filmecc)), reaproveitando integralmente os microsserviços, banco relacional, object storage, mensageria e gateways de pagamento na mesma infraestrutura e subdomínio.

---

## 1. Nome e Frase

**Entre Cartas** — Um arquivo afetivo e epistolar interativo em formato de scrapbook para pessoas sensíveis descobrirem, colecionarem e eternizarem cartas reais, desabafos e memórias humanas como objetos físicos digitais.

---

## 2. A Dor

* **Quem sofre:** Jovens e adultos (especialmente na faixa de 18 a 35 anos: estudantes universitários, leitores ávidos, entusiastas de escrita reflexiva, *journaling*, comunidades de *dark academia* e papelaria artesanal) que sofrem de esgotamento, ansiedade e alienação diante da superficialidade, efemeridade e toxicidade das redes sociais contemporâneas (feeds algorítmicos infinitos, busca viciante por métricas de vaidade, stories descartáveis que expiram em 24h e interfaces cinzentas corporativas sem calor humano).
* **Quando ocorre:** Durante momentos de introspecção e quietude, madrugadas solitárias, processos de luto emocional (términos de relacionamentos, saudades de quem partiu, distanciamento de amigos da infância) ou na busca por um refúgio criativo onde possam expressar e ler sentimentos verdadeiros sem o medo de julgamentos sociais.
* **Quanto custa hoje:**
  * **Custo Emocional e Tempo:** Horas diárias gastas em rolagem passiva de feeds que acentuam a sensação de vazio, inadequação e solidão ("fadiga digital de conexões fáceis").
  * **Custo Financeiro:** Gastos recorrentes de R$ 50,00 a R$ 200,00 mensais com insumos físicos de papelaria artesanal, cadernos importados de *scrapbook*, tintas, selos e canetas para registrar memórias que acabam confinadas em caixas de sapato, sem busca, sem categorização e sem segurança.
  * **Risco Real:** Risco de perda irreversível, mofo, deterioração física ou extravio de correspondências em mudanças; e, no ambiente digital tradicional, o perigo iminente de expor vulnerabilidades íntimas em redes sociais abertas (como Twitter/X ou Instagram) sujeitando-se ao cancelamento, ridicularização ou invasão de privacidade por conhecidos.
* **Como resolvem hoje (e por que falham):**
  * *Diários físicos e gavetas trancadas:* São seguros contra a exposição, porém geram isolamento absoluto: o indivíduo não descobre que outras pessoas ao redor do mundo compartilham das mesmas dores e sentimentos, e não contam com backup em nuvem.
  * *Fóruns de desabafo (Reddit r/UnsentLetters, r/desabafos):* Plataformas com estética fria, cinzenta, puramente funcional e hostil, frequentadas por usuários tóxicos e comentários desrespeitosos.
  * *Pastas no Pinterest ou Notion:* Coleções puramente visuais e desconexas de imagens estéticas ou blocos rígidos corporativos, incapazes de transmitir a emoção tátil de abrir um envelope, romper um lacre de cera ou desdobrar uma carta amarelada pelo tempo.

---

## 3. Persona Concreta

* **Nome:** Clara Menezes
* **Idade:** 24 anos
* **Localização e Ocupação:** Formada em Letras, trabalha como assistente de conteúdo em regime home office em São Paulo. Passa mais de 8 horas diárias diante de telas repletas de métricas de engajamento, e-mails corporativos assépticos e ferramentas padronizadas.
* **O que tenta fazer:** Ao final de um dia exaustivo, Clara busca desacelerar. Ela gosta de colocar um disco de vinil suave na vitrola, preparar uma xícara de chá e ler memórias humanas autênticas — cartas de amor não correspondidas guardadas no tempo, desabafos que nunca foram remetidos, reflexões sobre a passagem dos anos e cartas anônimas de desconhecidos. Ela também escreve textos viscerais que gostaria de soltar no mundo de forma anônima e sonha em organizar seu acervo de cartas favoritas em pastas temáticas delicadas, como se fossem fichários de uma biblioteca antiga.
* **O que a atrapalha:** As redes sociais convencionais quebram seu momento de refúgio com propagandas agressivas, comentários desnecessários e notificações urgentes. Guardar tudo apenas no seu diário de papel a faz se sentir sozinha no mundo com seus sentimentos, sem a certeza de que outras almas sensíveis entendem a sua melancolia.

---

## 4. Concorrentes e Alternativas

| Concorrente / Alternativa | O que é | O que faz mal / Onde falha |
| :--- | :--- | :--- |
| **Reddit** (*r/UnsentLetters, r/desabafos*) | Fóruns abertos de texto e desabafos anônimos | Interface cinzenta, puramente textual e sem qualquer apelo sensorial; ambiente propenso a trolls e comentários hostis; zero sensação de colecionismo ou preservação estética. |
| **Pinterest & Tumblr** | Redes visuais de pins e reposts de estética nostálgica | Foco em imagens estéticas desconexas e links quebrados; poluição por anúncios agressivos e memes fora de contexto; não prioriza a leitura atenta do texto da carta. |
| **Slowly** | App de troca de cartas virtuais com demora de entrega | Foco restrito a bate-papo bilateral (onde frequentemente ocorrem abandono e *ghosting* das conversas); não opera como um museu ou acervo público catalogado para leitura livre e descoberta de memórias. |
| **Cadernos Físicos & Scrapbooks** | Diários caseiros de papel e caixas de memórias | Insumos caros; não permite compartilhar o sentimento com o mundo nem encontrar conforto na dor alheia; deteriora com o tempo e não possui busca ou indexação. |

---

## 5. Proposta de Valor

> *\"Transformamos o resgate e o desabafo das emoções humanas em uma experiência tátil, íntima e nostálgica de abrir cartas reais em papel envelhecido, longe da pressa e do ruído das redes sociais.\"*

---

## 6. Modelo de Receita com Stripe

O Entre Cartas adota o modelo **Freemium com Assinatura Recorrente Mensal** gerenciada via **Stripe Billing / Checkout**:

### Comparativo de Planos

| Recursos e Limitações | Plano Leitor (Free — R$ 0,00/mês) | Clube do Remetente Pro (R$ 14,90/mês) |
| :--- | :--- | :--- |
| **Acesso ao Acervo Público** | Ilimitado (Cartas da Comunidade) | Ilimitado + Acervo Histórico Curado |
| **Experiência Sonora e Tátil** | Abertura de envelopes e papéis | Efeitos sonoros e visuais imersivos completos |
| **Pastas de Arquivo Pessoal** | Até 3 pastas de arquivo | **Pastas e caixas de memórias ilimitadas** |
| **Limite de Cartas Guardadas** | Até 5 cartas guardadas na caixa | **Cartas guardadas ilimitadas** |
| **Carimbos de Marcação** | Carimbo padrão (*\"LIDA\"*, *\"GUARDADA\"*) | **Carimbos de Colecionador** (*\"FAVORITA\"*, *\"ETERNA\"*, *\"RARA\"*) |
| **Envio de Cartas Anônimas** | Até 2 cartas/mês (fila comum de curadoria) | **Envio ilimitado** com curadoria e catalogação prioritária |
| **Estúdio de Papelaria** | Papel padrão (datilografado simples) | **Papéis raros** (linho, pergaminho, rasgado), lacres de cera e tipografias exclusivas |
| **Exportação Tipográfica** | Visualização web | **Download em PDF tipográfico de alta resolução** para impressão e colagem |

* **Por que alguém paga o Pro?** O público do nicho de *journaling*, literatura e papelaria já investe dezenas de reais mensalmente em itens físicos descartáveis. Por **R$ 14,90/mês** (menos que o valor de um cappuccino), o assinante desbloqueia ferramentas de personalização artística únicas, personaliza suas cartas com selos e lacres de cera, salva acervos ilimitados e apoia a manutenção de um refúgio literário livre de anúncios.

---

## 7. Métricas de Sucesso

1. **Assinantes Pagantes (Clube Pro):** Meta de atingir **150 assinantes Pro nos primeiros 90 dias**, gerando uma receita previsível de R$ 2.235,00/mês.
2. **MRR (Monthly Recurring Revenue):** Escalar para **R$ 5.000,00 de MRR** ao final do 6º mês, impulsionado por divulgações orgânicas em comunidades de leitores (#BookTok e #Journaling).
3. **Retenção & Churn:** Manter o **Churn Rate mensal abaixo de 5%**, sustentado pelo apego emocional dos usuários às cartas arquivadas em suas coleções pessoais.
4. **Engajamento Afetivo:** Média de **4 cartas abertas** e pelo menos **1 carta favoritada/carimbada por sessão** por usuário ativo.

---

## 8. Lean Canvas (9 Blocos)

| Bloco | Resposta do Entre Cartas |
| :--- | :--- |
| **1. Problema** | • Redes sociais superficiais, velozes e tóxicas que geram ansiedade e solidão.<br>• Falta de um espaço acolhedor e visualmente poético para ler e desabafar sentimentos verdadeiros.<br>• Caixas de memórias e diários físicos são caros, isolados e sujeitos a perda ou deterioração. |
| **2. Segmentos de Clientes** | • Jovens adultos (18–35 anos), leitores, escritores, fãs de *scrapbook*, *junk journals* e estética *vintage* / *dark academia*.<br>• *Early adopters:* Leitores de comunidades literárias (BookTok, Bookstagram, Letterboxd) e praticantes de escrita terapêutica. |
| **3. Proposta Única de Valor** | Um catálogo afetivo e sensorial de cartas e memórias humanas vivenciado como um scrapbook físico interativo — longe do ruído dos algoritmos. |
| **4. Solução** | • Catálogo de cartas abertas categorizadas por sentimento (Amor, Desabafo, Luto, Nunca Enviadas).<br>• Interface física (envelopes que abrem, papel que desdobra, marcas de carimbo, lacres de cera).<br>• Pastas de arquivo para colecionar memórias e estúdio de papelaria digital. |
| **5. Canais** | • Divulgação orgânica no TikTok e Instagram (#BookTok, #Journaling, #Scrapbook, #Poesia).<br>• Parcerias com clubes do livro e newsletters literárias independentes.<br>• Botão de compartilhamento estético que gera a prévia da carta em formato de papel antigo para redes. |
| **6. Fontes de Receita** | • Assinatura mensal no Stripe: **Clube do Remetente Pro** (R$ 14,90/mês ou R$ 149,00/ano).<br>• Futura venda de caixas físicas de papelaria colecionável com cartas impressas curadas. |
| **7. Estrutura de Custos** | • Hospedagem VPS / Servidor Cloud (Docker, MariaDB, Redis, MinIO).<br>• Taxas de processamento do Stripe (3,99% + R$ 0,39 por transação).<br>• Armazenamento de arquivos e texturas no MinIO/S3.<br>• Custos de domínio e serviço transacional de e-mail (Brevo). |
| **8. Métricas-Chave** | • Leitores cadastrados e Cartas abertas/lidas por dia.<br>• Assinantes ativos do Clube Pro e MRR (Receita Recorrente Mensal).<br>• Taxa de conversão Free → Pro (meta: 4% a 6%).<br>• Taxa de Churn mensal (< 5%). |
| **9. Vantagem Injusta** | • Identidade visual e experiência física (*Skeuomorphic Scrapbook UI*) inigualável, impossível de ser replicada por redes corporativas.<br>• Curadoria humana e apego emocional profundo dos usuários ao seu acervo de memórias salvas. |

---

## 9. Mapa de Reaproveitamento da Arquitetura

Toda a infraestrutura desenvolvida anteriormente foi ressignificada para dar vida ao ecossistema do **Entre Cartas**:

| Peça do Projeto Anterior | O que vira no Entre Cartas | Aplicação Prática no Domínio Epistolar |
| :--- | :--- | :--- |
| **Catálogo de Filmes (TMDB)** | **Catálogo de Cartas & Acervo Epistolar** | O catálogo passa a listar cartas reais e anônimas classificadas por sentimentos (*Amor, Desabafo, Nunca Enviadas, Luto, Memórias*), contendo metadados como remetente, data lírica, tipo de papel e selo. |
| **Microsserviço de Login + RBAC** | **Gestão de Identidades e Papéis** | Papéis: `leitor` (usuário gratuito), `remetente_pro` (assinante com estúdio de papelaria e acervo ilimitado) e `curador` / `admin` (responsável por moderar e aprovar cartas públicas). |
| **Logs e Auditoria (Redis Streams)** | **Eventos Sensoriais e de Negócio** | Rastreamento de ações do usuário na fila: `\"carta_deslacrada\"`, `\"carimbo_aplicado\"`, `\"carta_arquivada_na_pasta\"`, `\"assinatura_pro_renovada\"`. |
| **Upload e Perfil (MinIO / S3)** | **Mídias Físicas e Elementos de Papelaria** | Armazenamento de fotos estilo Polaroid anexadas às cartas, recortes de jornal escaneados, texturas de papel de alta resolução e selos postais customizados. |
| **Plano Premium (Stripe)** | **Assinatura do Clube do Remetente** | Assinatura recorrente mensal de R$ 14,90 gerenciada com Stripe Checkout, Customer Portal e Webhooks para liberação imediata dos privilégios Pro. |
| **Swagger / CI/CD / Observabilidade** | **Documentação de APIs & Deploy Contínuo** | Documentação completa dos endpoints de cartas, coleções e carimbos no Swagger; deploy automatizado na stack existente do Portainer. |

---

## 10. Backlog das Próximas Entregas (Issues no GitHub)

As issues abaixo formam o roteiro de execução técnica para as próximas etapas (Atividades 10 e 11):

1. **Issue #1 — Modelagem do Banco de Dados: Tabelas de Cartas, Categorias Emocionais e Pastas**
   - Substituição da estrutura de filmes pela modelagem epistolar do Entre Cartas no MariaDB.
   - Criação da tabela `cartas` com atributos de papel, selo, lacre e curadoria.
   - Criação da tabela `pastas_memorias` e `carta_favoritos` com carimbos visuais.
   - Seed de cartas iniciais poéticas para demonstração rica e imediata.

2. **Issue #2 — Autenticação e RBAC: Implementação dos Papéis Leitor, Remetente Pro e Curador**
   - Ajustar o microsserviço de autenticação para os papéis de negócio do Entre Cartas.
   - Papel `leitor`: Acesso padrão de leitura e limite de cartas guardadas.
   - Papel `remetente_pro`: Permissões para pastas ilimitadas, papéis nobres e envio prioritário.
   - Papel `curador` / `admin`: Painel de moderação para aprovar ou recusar cartas da comunidade.

3. **Issue #3 — Design System Tátil: Componentes Paper, TornPaper, Envelope, Stamp, WaxSeal e Folder**
   - Criação dos componentes visuais de papelaria artesanal e scrapbook.
   - Texturas de papel envelhecido, sombras realistas e rotações orgânicas sutis.
   - Componente `Envelope` com aba dobrável e lacre de cera.
   - Componente `Stamp` simulando impacto físico de tinta desgastada.

4. **Issue #4 — Motor de Leitura e Interações Físicas: Animação de Abrir Envelope e Carimbar Carta**
   - Animação interativa com Framer Motion: clique no envelope, ruptura do lacre e desdobrar do papel.
   - Efeito de impacto tátil e sonoro do carimbo ao favoritar/guardar a carta.
   - Animação de arquivamento da carta deslizando fisicamente para dentro da pasta.

5. **Issue #5 — Integração Stripe: Assinatura do Clube do Remetente Pro e Webhook de Ativação**
   - Configuração de produto e preço recorrente no Stripe Billing (R$ 14,90/mês).
   - Fluxo de Checkout seguro com Stripe Hosted Checkout e Customer Portal.
   - Webhook para escutar eventos de pagamento e atualizar o papel do usuário no banco.

6. **Issue #6 — Sistema de Upload no MinIO: Polaroids, Selos e Recortes Anexados às Cartas**
   - Configuração de bucket no MinIO para anexos fotográficos e de arte.
   - Upload de fotos estilo Polaroid anexadas com fita adesiva (washi tape) às cartas.
   - Tratamento e compressão de imagens para garantir carregamento instantâneo.

---

## 👤 Autor e Créditos
* **Autor:** Daniel Marçal Gonçalves
* **Disciplina:** Introdução à Computação em Nuvem (ISW055)
* **Professor:** [@siriani](https://github.com/siriani) — Fatec Pompeia
