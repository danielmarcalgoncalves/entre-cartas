import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell">
      <div className="not-found-paper">
        <span className="stamp-mark">UNKNOWN ADDRESS</span>
        <h1 className="display-title" style={{ margin: "20px auto 12px", fontSize: "clamp(42px,7vw,68px)" }}>This letter took another path.</h1>
        <p className="page-intro" style={{ margin: "0 auto 22px" }}>The envelope is not in this box. Perhaps another story is waiting to be found.</p>
        <Link href="/discover" className="text-link">Return to archive ↗</Link>
      </div>
    </div>
  );
}
