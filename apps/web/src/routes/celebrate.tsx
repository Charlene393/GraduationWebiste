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

function CelebratePage() {
  const { data: session, isPending } = authClient.useSession();
  const [view, setView] = useState<"none" | "photos">("none");
  const [activeProgram, setActiveProgram] = useState(0);
  const photos = useQuery(orpc.celebrationPhotos.queryOptions());
  const upload = useMutation(orpc.uploadCelebrationPhoto.mutationOptions({
    onSuccess: (photo) => queryClient.setQueryData(orpc.celebrationPhotos.queryKey(), (current: typeof photos.data) => [photo, ...(current || [])]),
  }));
  const signOut = () => authClient.signOut({
    fetchOptions: { onSuccess: () => window.location.assign("/") },
  });

  useEffect(() => { if (!isPending && !session) window.location.replace("/"); }, [isPending, session]);
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
    <header className="celebrate-hero"><button className="celebrate-logout" type="button" onClick={signOut}>Log out</button><p>Saturday, 15 August 2026</p><h1>Charlene’s graduation</h1><span>I’m really glad you’ll be there.</span></header>
    <section className="celebrate-grid">
      <article className="celebrate-card"><h2>Programme</h2><p className="program-hint">Here’s how the day will go. Tap an item for more.</p><ol className="program-list">{PROGRAM.map((event, index) => <li key={event.time}><button type="button" className={activeProgram === index ? "program-item is-active" : "program-item"} onClick={() => setActiveProgram(index)}><time>{event.time}</time><span><strong>{event.title}</strong>{activeProgram === index && <small>{event.note}</small>}</span><b>+</b></button></li>)}</ol></article>
      <button className="photo-card action-card" type="button" onClick={() => setView("photos")}><h2>Photos from the day</h2><p>See what everyone is sharing, or add your own.</p><span className="card-link">Open photos <em>{photos.data?.length || 0}</em></span></button>
    </section>
    {view === "photos" && <div className="celebrate-overlay" role="dialog" aria-modal="true" aria-label="Celebration photo gallery"><section className="celebrate-modal photo-modal"><button className="modal-close" onClick={() => setView("none")} type="button">×</button><p className="card-kicker">Make a memory</p><h2>Celebration gallery</h2><label className="photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} disabled={upload.isPending} /><span>{upload.isPending ? "Uploading…" : "Add your photos"}</span></label><p className="upload-help">JPG, PNG, or WebP · up to 2.5 MB each</p>{photos.data?.length ? <div className="photo-gallery">{photos.data.map((photo) => <figure key={photo.id}><img src={`data:${photo.mimeType};base64,${photo.data}`} alt={photo.name} /><figcaption>Shared by {photo.user.name}</figcaption></figure>)}</div> : <p className="empty-gallery">Be the first to share a photo from the celebration.</p>}</section></div>}
  </main>;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
