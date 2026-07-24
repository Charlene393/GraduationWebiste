import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: AccessPage,
});

function AccessPage() {
  return (
    <main className="invitation-page">
      <div className="ambient ambient-red" />
      <div className="ambient ambient-blue" />
      <div className="star-field" aria-hidden="true" />
      <section className="invitation-access">
        <p className="scene-kicker">Charlene Mbugua · Graduation 2026</p>
        <h1>A celebration awaits.</h1>
        <p className="access-copy">Charlene will send each guest a personal invitation link. Open yours to see your name on the envelope and RSVP.</p>
      </section>
    </main>
  );
}
