import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell">
      <div className="not-found-paper">
        <span className="stamp-mark">ENDEREÇO INCERTO</span>
        <h1 className="display-title" style={{ margin: "20px auto 12px", fontSize: "clamp(42px,7vw,68px)" }}>Esta carta tomou outro caminho.</h1>
        <p className="page-intro" style={{ margin: "0 auto 22px" }}>O envelope não está nesta caixa. Talvez outra história queira ser encontrada.</p>
        <Link href="/discover" className="text-link">Voltar ao arquivo ↗</Link>
      </div>
    </div>
  );
}
