import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-content" style={{ maxWidth: 720, margin: "0 auto", paddingTop: 96 }}>
      <p className="panel-eyebrow">404</p>
      <h1>That page is not in your journey.</h1>
      <p>We could not find the page you requested.</p>
      <Link className="secondary-button" href="/">
        Return to AdmitOS
      </Link>
    </main>
  );
}
