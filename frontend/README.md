# Entre Cartas

Fundação frontend de um arquivo digital de cartas e memórias, feito com Next.js App Router, React, TypeScript, Tailwind CSS e Framer Motion (instalado para futuras interações; a versão entregue permanece sem animações físicas).

## Pré-requisitos

- Node.js compatível com Next.js 16
- pnpm 11.25.0 (versão fixada em `package.json`)

## Executar localmente

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Para uma compilação otimizada:

```bash
pnpm build
pnpm start
```

## Bibliotecas

- `next` — framework e rotas App Router
- `react`, `react-dom` — interface e renderização
- `tailwindcss`, `@tailwindcss/postcss` — utilitários CSS e integração PostCSS
- `framer-motion` — dependência preparada para futuras animações
- `typescript`, `@types/node`, `@types/react`, `@types/react-dom` — tipagem e ferramentas de desenvolvimento

As versões exatas estão em `package.json` e `pnpm-lock.yaml`.

## Estrutura

- `src/app/` — páginas: início, descoberta, favoritas, coleções, leitura `/letter/[id]`, estilos globais, layout, ícone e página 404
- `src/components/` — componentes reutilizáveis de cartas, papel, selos, pastas, navegação e elementos de scrapbook
- `src/data/letters.ts` — conteúdo demonstrativo, categorias e tipos
- `src/hooks/useArchive.ts` — favoritas e cartas guardadas usando `localStorage`
- `public/hero-collage.webp` — colagem usada no hero
- `public/brand-seal.svg` — selo da marca
- `public/manus-routes.json` — declaração das rotas do site
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` — dependências e configuração do pnpm

## Observações

Esta entrega é somente frontend: não há API, banco de dados, autenticação nem importação dos datasets Kaggle citados no briefing. O conteúdo das cartas serve como demonstração; as ações de favoritas e arquivamento ficam no navegador que as salvou.
