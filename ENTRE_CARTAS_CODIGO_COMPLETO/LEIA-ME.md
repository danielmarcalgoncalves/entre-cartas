# Entre Cartas — código-fonte do frontend

Este pacote contém todos os arquivos-fonte versionados do frontend Entre Cartas, com `package.json`, `package-lock.json`, configuração, rotas, componentes, dados de demonstração e assets locais. Não inclui `node_modules`, `.next` nem o repositório `.git`; instale dependências a partir do lockfile.

## Executar localmente

Requisitos do projeto original: Node.js `>=22.13.0` e npm `10.9.2`.

```bash
cd entre-cartas
npm ci
npm run dev
```

A aplicação de desenvolvimento usa a porta 3000. Para verificar o código e compilar:

```bash
npm run typecheck
npm run build
npm start
```

## Estrutura principal

- `app/`: homepage, catálogo, detalhe dinâmico, coleções, layout, estilos e ícone.
- `components/`: componentes de papel, telas, navegação e estado de favoritos/pastas.
- `lib/`: contratos e dados demonstrativos de cartas/categorias e configuração visual de pastas.
- `public/`: manifesto de rotas, logo e imagem local do manuscrito.
- `INSTRUCAO_IA_INTEGRAR.md` (na raiz deste pacote): procedimento e prompt para integrar o frontend a outro sistema.

## Limites importantes

Este é o **frontend completo**, não um backend: o conteúdo em `lib/letters.ts` é demonstrativo e favoritos/pastas usam `localStorage`. Ao integrar a um sistema real, conecte-os aos serviços existentes com autorização por usuário; não trate as cartas de demonstração como dados reais.

Três imagens originais permanecem referenciadas por caminhos de storage do Manus (`/manus-storage/async-images/...`) em `components/home-page.tsx` e `components/letter-detail-page.tsx`, mas não estão incorporadas no ZIP. Copie os originais para o storage estático do destino e atualize os caminhos, ou use arquivos aprovados. A fotografia de manuscrito em `public/images/manuscrito-pixabay.jpg` está incluída; consulte `public/images/SOURCES.md` para procedência.

`app.config.ts` e `public/manus-routes.json` contêm configuração associada ao ambiente Manus. Adapte ou remova apenas se o ambiente de destino não os utilizar.
