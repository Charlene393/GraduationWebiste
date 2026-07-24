import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/celebration/$token")({ component: GuestCelebrationPage });

const PROGRAM = [
  ["10:00 AM", "Guests arrive", "Settle in, say hello, and get ready for the day."],
  ["11:00 AM", "Graduation ceremony", "The moment we have all been waiting for."],
  ["1:00 PM", "Photos & congratulations", "Bring your best smile — it is picture time."],
  ["2:00 PM", "Lunch & celebration", "Good food, happy memories, and plenty of laughter."],
] as const;

function GuestCelebrationPage() {
  const { token } = Route.useParams();
  const invitation = useQuery(orpc.guestInvitation.queryOptions({ input: { token } }));

  if (invitation.isLoading) return <main className="invitation-page"><p className="access-copy">Preparing the celebration…</p></main>;
  if (!invitation.data || invitation.data.rsvpStatus !== "ATTENDING") return <main className="invitation-page"><section className="invitation-access"><h1>This celebration page is not available yet.</h1><p className="access-copy">Please confirm that you are able to attend through your invitation first.</p></section></main>;

  return <main className="celebrate-page">
    <header className="celebrate-hero"><p>Saturday, 15 August 2026</p><h1>Charlene’s graduation</h1><span>Thank you for celebrating this special moment with me, {formatName(invitation.data.name)}.</span></header>
    <section className="celebrate-grid"><article className="celebrate-card"><h2>Programme</h2><p className="program-hint">Here’s how the day will unfold.</p><ol className="program-list">{PROGRAM.map(([time, title, note]) => <li key={time}><div className="program-item"><time>{time}</time><span><strong>{title}</strong><small>{note}</small></span></div></li>)}</ol></article><article className="photo-card action-card"><p className="card-kicker">A little note</p><h2>Let’s make memories</h2><p>Bring your best smile and enjoy every beautiful moment of the day.</p></article></section>
    <section className="details-grid"><article className="detail-card"><h2>Getting there</h2><p>The celebration will be at Charlene’s home. Open the venue pin for directions from wherever you are.</p><a href="https://www.openstreetmap.org/?mlat=-1.279838&mlon=36.629364#map=18/-1.279838/36.629364" target="_blank" rel="noreferrer">Open venue location</a></article><article className="detail-card graduate-note"><h2>A note from Charlene</h2><p>“Thank you for cheering me on through this chapter. Having you there will mean so much to me.”</p></article></section>
  </main>;
}

function formatName(name: string) {
  const value = name.trim();
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Guest";
}
