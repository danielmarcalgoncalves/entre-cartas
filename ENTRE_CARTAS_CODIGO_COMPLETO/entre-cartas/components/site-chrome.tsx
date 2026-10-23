import Link from "next/link";

function Wordmark() {
  return <Link className="wordmark" href="/" aria-label="Entre Cartas — início">
    <span className="wordmark__seal" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M7 12.5 20 22l13-9.5M9 11h22a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6"/><path d="m14 26 4-3M26 26l-4-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="31" cy="9" r="3.5" fill="#9A3028"/></svg></span>
    <span className="wordmark__text">entre <i>cartas</i><small>UM ARQUIVO DE SENTIMENTOS</small></span>
  </Link>;
}

export function SiteHeader() {
  return <header className="site-header">
    <Wordmark />
    <nav className="site-nav" aria-label="Navegação principal">
      <Link href="/arquivo">Explorar cartas</Link>
      <Link href="/colecoes">Minha caixa</Link>
    </nav>
    <Link className="header-note" href="/arquivo"><span className="header-note__dot" /> Uma carta pode esperar por você</Link>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <Wordmark />
    <p>Feito para guardar o que as palavras deixam na gente.</p>
    <span className="footer-seal" aria-hidden="true">ARQUIVO <b>✳</b> PESSOAL</span>
  </footer>;
}
