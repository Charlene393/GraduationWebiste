import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: AccessPage,
});

function AccessPage() {
  const recipient = new URLSearchParams(window.location.search).get("to")?.trim() || "Dear Guest";
  const loginUrl = `/login?to=${encodeURIComponent(recipient)}`;

  return (
    <main className="invitation-page">
      <div className="ambient ambient-red" />
      <div className="ambient ambient-blue" />
      <div className="star-field" aria-hidden="true" />
      <section className="invitation-access">
        <p className="scene-kicker">Charlene Mbugua · Graduation 2026</p>
        <h1>Sign in to get your invite.</h1>
        <p className="access-copy">Your graduation invitation is waiting. Sign in or create an account to open it and confirm your attendance.</p>
        <a className="access-button" href={loginUrl}>Sign in or create an account</a>
      </section>
    </main>
  );
}
