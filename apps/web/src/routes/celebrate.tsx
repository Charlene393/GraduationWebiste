import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChangeEvent, useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/celebrate")({ component: CelebratePage });

const PROGRAM = [
  { time: "10:00 AM", title: "Guests arrive", note: "Settle in, say hello, and get ready for the day." },
  { time: "11:00 AM", title: "Graduation ceremony", note: "The moment we have all been waiting for." },
  { time: "1:00 PM", title: "Photos & congratulations", note: "Bring your best smile — it is picture time." },
  { time: "2:00 PM", title: "Lunch & celebration", note: "Good food, happy memories, and plenty of laughter." },
];
const EVENT_START = new Date("2026-08-15T10:00:00+03:00");
const OPEN_STREET_MAP_URL = "https://www.openstreetmap.org/?mlat=-1.279838&mlon=36.629364#map=18/-1.279838/36.629364";
const VENUE_COORDINATES = "-1.279838,36.629364";

function CelebratePage() {
  const { data: session, isPending } = authClient.useSession();
  const [view, setView] = useState<"none" | "photos">("none");
  const [activeProgram, setActiveProgram] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [guestbookText, setGuestbookText] = useState("");
  const photos = useQuery(orpc.celebrationPhotos.queryOptions());
  const guestbook = useQuery(orpc.guestbookMessages.queryOptions());
  const upload = useMutation(orpc.uploadCelebrationPhoto.mutationOptions({
    onSuccess: (photo) => queryClient.setQueryData(orpc.celebrationPhotos.queryKey(), (current: typeof photos.data) => [photo, ...(current || [])]),
  }));
  const signOut = () => authClient.signOut({
    fetchOptions: { onSuccess: () => window.location.assign("/") },
  });
  const signGuestbook = useMutation(orpc.signGuestbook.mutationOptions({
    onSuccess: (entry) => {
      queryClient.setQueryData(orpc.guestbookMessages.queryKey(), (current: typeof guestbook.data) => [entry, ...(current || [])]);
      setGuestbookText("");
    },
  }));

  useEffect(() => { if (!isPending && !session) window.location.replace("/"); }, [isPending, session]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  if (isPending || !session) return <main className="invitation-page"><p className="access-copy">Getting everything ready…</p></main>;

  const selectPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      if (!/image\/(jpeg|png|webp)/.test(file.type) || file.size > 2_500_000) continue;
      const data = await readFile(file);
      upload.mutate({ name: file.name, mimeType: file.type, data });
    }
    event.target.value = "";
  };

  return <main className="celebrate-page">
    <header className="celebrate-hero"><button className="celebrate-logout" type="button" onClick={signOut}>Log out</button><p>Saturday, 15 August 2026</p><h1>Charlene’s graduation</h1><span>I’m really glad you’ll be there.</span><Countdown now={now} /></header>
    <section className="celebrate-grid">
      <article className="celebrate-card"><h2>Programme</h2><p className="program-hint">Here’s how the day will go. Tap an item for more.</p><ol className="program-list">{PROGRAM.map((event, index) => <li key={event.time}><button type="button" className={activeProgram === index ? "program-item is-active" : "program-item"} onClick={() => setActiveProgram(index)}><time>{event.time}</time><span><strong>{event.title}</strong>{activeProgram === index && <small>{event.note}</small>}</span><b>+</b></button></li>)}</ol></article>
      <button className="photo-card action-card" type="button" onClick={() => setView("photos")}><h2>Photos from the day</h2><p>See what everyone is sharing, or add your own.</p>{photos.data?.length ? <div className="photo-preview" aria-hidden="true">{photos.data.slice(0, 3).map((photo) => <img key={photo.id} src={`data:${photo.mimeType};base64,${photo.data}`} alt="" />)}</div> : null}<span className="card-link">Open photos <em>{photos.data?.length || 0}</em></span></button>
    </section>
    <section className="details-grid"><article className="detail-card"><h2>Getting there</h2><p>Get directions from wherever you are to the celebration venue.</p><button className="directions-link" type="button" onClick={openDirections}>Get directions</button></article><article className="detail-card graduate-note"><h2>A note from Charlene</h2><p>“Thank you for cheering me on through this chapter. Having you there will mean so much to me.”</p></article><button className="detail-card calendar-card" type="button" onClick={downloadCalendar}><h2>Add to calendar</h2><p>Save the celebration date to your calendar.</p><span>Download calendar invite</span></button></section>
    <section className="guestbook"><div><p>Leave a little love</p><h2>Guestbook</h2></div><form onSubmit={(event) => { event.preventDefault(); if (guestbookText.trim()) signGuestbook.mutate({ message: guestbookText }); }}><textarea value={guestbookText} onChange={(event) => setGuestbookText(event.target.value)} maxLength={500} placeholder="Write Charlene a short message…" /><button type="submit" disabled={signGuestbook.isPending || guestbookText.trim().length < 2}>{signGuestbook.isPending ? "Sending…" : "Leave a message"}</button></form>{guestbook.data?.length ? <div className="guestbook-list">{guestbook.data.map((entry) => <article key={entry.id}><p>“{entry.message}”</p><span>— {entry.user.name}</span></article>)}</div> : <p className="guestbook-empty">Be the first to leave a message.</p>}</section>
    {view === "photos" && <div className="celebrate-overlay" role="dialog" aria-modal="true" aria-label="Celebration photo gallery"><section className="celebrate-modal photo-modal"><button className="modal-close" onClick={() => setView("none")} type="button">×</button><p className="card-kicker">Make a memory</p><h2>Celebration gallery</h2><label className="photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} disabled={upload.isPending} /><span>{upload.isPending ? "Uploading…" : "Add your photos"}</span></label><p className="upload-help">JPG, PNG, or WebP · up to 2.5 MB each</p>{photos.data?.length ? <div className="photo-gallery">{photos.data.map((photo) => <figure key={photo.id}><img src={`data:${photo.mimeType};base64,${photo.data}`} alt={photo.name} /><figcaption>Shared by {photo.user.name}</figcaption></figure>)}</div> : <p className="empty-gallery">Be the first to share a photo from the celebration.</p>}</section></div>}
  </main>;
}

function Countdown({ now }: { now: number }) {
  const remaining = Math.max(0, EVENT_START.getTime() - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return <div className="countdown"><div><strong>{days}</strong><span>days</span></div><div><strong>{hours}</strong><span>hours</span></div><div><strong>{minutes}</strong><span>mins</span></div></div>;
}

function downloadCalendar() {
  const calendar = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:charlene-graduation-2026", "DTSTART:20260815T070000Z", "DTEND:20260815T140000Z", "SUMMARY:Charlene’s Graduation Celebration", "DESCRIPTION:Come celebrate Charlene Mbugua’s graduation.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar" }));
  link.download = "charlene-graduation.ics";
  link.click();
  URL.revokeObjectURL(link.href);
}

function openDirections() {
  const openVenue = () => window.open(OPEN_STREET_MAP_URL, "_blank", "noopener,noreferrer");
  if (!navigator.geolocation) {
    openVenue();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const route = `${coords.latitude},${coords.longitude};${VENUE_COORDINATES}`;
      const directionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`;
      window.open(directionsUrl, "_blank", "noopener,noreferrer");
    },
    openVenue,
    { enableHighAccuracy: true, timeout: 10_000 },
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
