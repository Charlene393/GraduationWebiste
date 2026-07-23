import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/celebrate")({ component: CelebratePage });

const PROGRAM = [
  ["10:00 AM", "Guests arrive"],
  ["11:00 AM", "Graduation ceremony"],
  ["1:00 PM", "Photos & congratulations"],
  ["2:00 PM", "Lunch & celebration"],
];

const MENU = ["Celebration bites", "Main course", "Something sweet", "Refreshing drinks"];

function CelebratePage() {
  const { data: session, isPending } = authClient.useSession();
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    if (!isPending && !session) window.location.replace("/");
  }, [isPending, session]);

  if (isPending || !session) return <main className="invitation-page"><p className="access-copy">Getting everything ready…</p></main>;

  return (
    <main className="celebrate-page">
      <header className="celebrate-hero"><p>Charlene Mbugua · Class of 2026</p><h1>Let’s celebrate!</h1><span>Thank you for confirming — I can’t wait to share the day with you.</span></header>
      <section className="celebrate-grid">
        <article className="celebrate-card"><p className="card-kicker">The day</p><h2>Programme</h2><ol className="program-list">{PROGRAM.map(([time, item]) => <li key={time}><time>{time}</time><span>{item}</span></li>)}</ol></article>
        <article className="celebrate-card"><p className="card-kicker">At the table</p><h2>Menu</h2><ul className="menu-list">{MENU.map((item) => <li key={item}>{item}</li>)}</ul><p className="menu-note">A full menu will be shared closer to the celebration.</p></article>
      </section>
      <section className="photo-card"><p className="card-kicker">Make a memory</p><h2>Share your photos</h2><p>Add your favourite photos from the day so we can keep the celebration together.</p><label className="photo-picker"><input type="file" accept="image/*" multiple onChange={(event) => setPhotos(Array.from(event.target.files || []))} /><span>Choose photos</span></label>{photos.length > 0 && <p className="photo-selected">{photos.length} photo{photos.length === 1 ? "" : "s"} selected — ready for upload.</p>}</section>
    </main>
  );
}
