# Instrução para uma IA integrar o frontend Entre Cartas

## Objetivo

Integrar o frontend deste pacote ao sistema de destino sem substituir nem danificar sua arquitetura atual. O resultado deve manter a experiência visual de arquivo de cartas e scrapbook do Entre Cartas, mas deve usar as rotas, serviços de API, autenticação, autorização, persistência, convenções e ferramentas de build que já existem no sistema anfitrião.

## O que há neste pacote

O código foi criado com Next.js App Router, React, TypeScript, Tailwind CSS v4 e Framer Motion. Usa Node.js >= 22.13.0 e npm 10.9.2 no projeto original. O código-fonte principal está na pasta `entre-cartas/`.

Rotas de interface existentes:

- `/` — homepage cinematográfica e cartas em destaque.
- `/arquivo` — busca e filtragem pelas categorias.
- `/cartas/[id]` — detalhe/leitura de uma carta.
- `/colecoes` — pastas com as cartas arquivadas.

Peças principais: `components/paper-kit.tsx` (objetos reutilizáveis de papel), `components/home-page.tsx`, `components/archive-page.tsx`, `components/letter-detail-page.tsx`, `components/collections-page.tsx` e `components/site-chrome.tsx`. Os dados de exemplo e tipos ficam em `lib/letters.ts`; as pastas visuais ficam em `lib/folders.ts`; o estado do arquivo fica em `components/archive-store.tsx`. As páginas do App Router estão em `app/` e o sistema visual está em `app/globals.css` e `app/interaction-overrides.css`.

## Limites que precisam ser respeitados

1. **Este pacote contém o frontend; não contém um backend de produção.** As cartas de `lib/letters.ts` são dados de demonstração. Não as apresente como um acervo real do sistema se não forem substituídas por dados autorizados.
2. **Favoritos e pastas ainda usam `localStorage`.** `components/archive-store.tsx` grava localmente sob a chave `entre-cartas:arquivo:v1`. Isso é adequado apenas para a demonstração de um único navegador. Em um sistema com contas, conecte essas ações à persistência autenticada por meio das APIs existentes; cada usuário deve ver e alterar somente seus próprios favoritos e coleções.
3. **Não invente rotas de API, campos, tabelas ou regras de negócio.** Procure primeiro documentação, tipos, clientes HTTP e serviços já existentes no repositório. Se o contrato de cartas/favoritos/pastas não existir ou for ambíguo, descreva a proposta e solicite confirmação ao responsável; não finja que um endpoint existe nem grave dados de demonstração em produção.
4. **Três imagens do projeto original não estão incorporadas ao ZIP.** O código aponta para `/manus-storage/async-images/...` em `components/home-page.tsx` e `components/letter-detail-page.tsx`; esses caminhos pertencem ao storage gerenciado do projeto Manus e não são portáveis automaticamente. Exporte os arquivos originais do projeto Manus e copie-os para o storage estático autorizado do sistema de destino, depois atualize os `src` para caminhos desse sistema. Se não puder acessar as imagens, peça os arquivos ou substitua-as apenas por assets aprovados; nunca deixe referências quebradas. A imagem de manuscrito `entre-cartas/public/images/manuscrito-pixabay.jpg` está incluída no pacote e sua fonte/licença está em `entre-cartas/public/images/SOURCES.md`.
5. `app.config.ts` e `public/manus-routes.json` são arquivos ligados ao ambiente Manus. Inspecione-os e preserve-os somente se o destino também depender deles; não os trate como configuração universal de Next.js.
6. Não substitua autenticação, autorização, middleware, sessão, banco, dependências ou configuração de deploy do sistema anfitrião por versões deste pacote. Não copie segredos para o cliente, código-fonte, prompt, logs ou `.env` versionado.

## Procedimento de integração

1. Faça um inventário do sistema existente antes de editar: framework/versão, ponto de entrada, roteador, layout, CSS/Tailwind, biblioteca de componentes, comandos e lockfile, APIs/clientes HTTP, autenticação, autorização, modelo de dados, convenções de teste e regras de deploy. Leia o README e as instruções locais.
2. Apresente um plano curto de arquivos/rotas/componentes que serão adaptados. Reutilize os padrões do anfitrião; não crie um segundo aplicativo dentro do aplicativo e não migre de framework sem autorização explícita.
3. Mapeie as quatro telas para rotas existentes. Se já houver rotas equivalentes, estenda-as sem duplicá-las. Preserve URLs públicas já usadas pelo sistema; se for necessário um prefixo, use-o de forma consistente em links, breadcrumbs e chamadas de navegação.
4. Integre os elementos visuais de `paper-kit.tsx` e os componentes de página ao layout atual. Evite conflitos globais: isole estilos com CSS Modules, escopo de classe ou a convenção já usada no repositório. Não remova resets, tokens ou estilos globais do sistema anfitrião.
5. Substitua a fonte de demonstração `lib/letters.ts` pelo serviço de dados já utilizado pelo sistema. Preserve/adapte o tipo `Letter` (id, title, category, sender, date, excerpt, content, artifact, accent, readingTime) ao contrato real; não suponha que todos esses campos existem no backend. Mantenha os IDs estáveis para links de detalhe e categorias compatíveis com os dados autorizados.
6. Substitua a persistência local de `ArchiveProvider` por um adaptador que utilize APIs existentes para favoritar/desfavoritar e mover para uma pasta. Mantenha a interface otimista se esse for o padrão do sistema, trate erros/reversão, estados de carregamento e sessão expirada, e isole a cache pelo usuário autenticado. Não use `localStorage` como fonte de verdade de dados privados ou compartilhados.
7. Mantenha texto e experiência em português do Brasil, navegação por teclado, foco visível, rótulos acessíveis e conteúdo de cartas renderizado como texto seguro. Não use `dangerouslySetInnerHTML` sem sanitização aprovada.
8. Resolva todos os assets do scrapbook no armazenamento estático existente, sem URLs privadas temporárias nem caminhos exclusivos do Manus. Mantenha a procedência/licença dos assets fornecidos.
9. Siga os scripts, lint, typecheck, testes e build do sistema anfitrião. Acrescente ou atualize testes conforme o padrão existente para busca/filtro, leitura por ID, estado vazio/erro, autorização de favoritos e persistência por usuário. Não faça escritas destrutivas no banco de produção para testar.
10. Ao concluir, informe os arquivos alterados, rotas integradas, serviços/endpoints existentes que foram reutilizados, assets migrados, verificações executadas e qualquer contrato ou decisão que ainda dependa do responsável. Diferencie claramente integração terminada de itens pendentes.

## Prompt pronto para copiar para a IA de programação

> Integre o frontend Entre Cartas do pacote anexado ao sistema que já está aberto neste repositório. Primeiro inspecione o README, o framework, o roteador, os estilos, os scripts, a autenticação, as APIs/clientes e os modelos existentes. Não crie outro aplicativo, não substitua o backend, o banco, a autenticação, o middleware, as configurações de deploy ou o lockfile do sistema anfitrião. Antes de editar, proponha um plano curto usando a arquitetura existente.
>
> O pacote contém um frontend Next.js/React com páginas `/`, `/arquivo`, `/cartas/[id]` e `/colecoes`; objetos visuais reutilizáveis em `components/paper-kit.tsx`; estilos vintage em `app/globals.css` e `app/interaction-overrides.css`; exemplos em `lib/letters.ts`; e estado de favoritos/pastas atualmente local em `components/archive-store.tsx`. Reaproveite/adapte essas peças ao roteador e às convenções reais do sistema, preservando a estética artesanal de papel envelhecido, as seis categorias (Amor, Saudade, Desabafos, Nunca Enviadas, Tristeza e Históricas), a leitura legível, os carimbos e as pastas físicas. Mantenha o idioma pt-BR e a acessibilidade.
>
> Conecte cartas, favoritos e pastas somente às APIs e contratos que encontrar documentados/implementados no sistema. Os dados atuais de `lib/letters.ts` são demonstração, não dados reais; `ArchiveProvider` usa `localStorage` e precisa ser substituído por persistência autorizada por usuário autenticado quando existir backend. Não invente endpoints, tabelas, campos ou regras de acesso. Se faltar um contrato necessário, não simule gravações de produção: faça o front depender de um adaptador claramente delimitado e peça ao responsável a decisão pendente.
>
> Três imagens usadas no código apontam para `/manus-storage/async-images/...` e não estão dentro do ZIP. Procure primeiro os originais fornecidos pelo responsável; copie-os para o storage estático do sistema e atualize as referências. Se não houver acesso, solicite os arquivos ou assets substitutos aprovados e não deixe links quebrados. A imagem de manuscrito incluída no pacote pode permanecer no caminho local, com sua fonte em `public/images/SOURCES.md`.
>
> Integre as telas às rotas existentes, sem duplicar caminhos ou quebrar URLs. Isole o CSS para evitar colisões, respeite as versões/dependências já instaladas e não exponha segredos no frontend. Execute as verificações previstas pelo repositório (typecheck, testes e build). Ao final, liste arquivos alterados, rotas, APIs existentes conectadas, testes/build executados e pendências explícitas. Trabalhe nos arquivos do projeto e não responda apenas com trechos de código.
