import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell">
      <div className="not-found-paper">
        <span className="stamp-mark">UNKNOWN ADDRESS</span>
        <h1 className="display-title" style={{ margin: "20px auto 12px", fontSize: "clamp(42px,7vw,68px)" }}>This page took another path.</h1>
        <p className="page-intro" style={{ margin: "0 auto 22px" }}>The page you are looking for is not in this volume. Return to your journal or explore fresh inspirations.</p>
        <Link href="/journal" className="text-link">Return to My Journal ↗</Link>
      </div>
    </div>
  );
}
