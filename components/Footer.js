// Site footer: landing and legal pages only. App pages have no footer.
import Link from "next/link";
import RadarMark from "./RadarMark.js";

export default function Footer() {
  return (
    <footer className="footer">
      <span className="brand"><RadarMark size={16} />Cron Job Observatory</span>
      <nav>
        <Link href="/docs">Docs</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="https://github.com/abdullah129026/cron-observatory">GitHub</a>
      </nav>
      <span>Free in v1, no card.</span>
    </footer>
  );
}
