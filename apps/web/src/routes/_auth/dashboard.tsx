import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChangeEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const ORGANISER_EMAIL = "mbuguacharlene@gmail.com";

export const Route = createFileRoute("/_auth/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { session } = Route.useRouteContext();
  const isOrganiser = session.data?.user.email === ORGANISER_EMAIL;
  const responses = useQuery({ ...orpc.organiserRsvps.queryOptions(), enabled: isOrganiser });
  const overview = useQuery({ ...orpc.organiserOverview.queryOptions(), enabled: isOrganiser });
  const photos = useQuery({ ...orpc.organiserPhotos.queryOptions(), enabled: isOrganiser });
  const [guestFilter, setGuestFilter] = useState<"ALL" | "ATTENDING" | "DECLINED">("ALL");
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const refreshPhotoData = () => {
    queryClient.invalidateQueries({ queryKey: orpc.organiserPhotos.queryKey() });
    queryClient.invalidateQueries({ queryKey: orpc.celebrationPhotos.queryKey() });
    queryClient.invalidateQueries({ queryKey: orpc.organiserOverview.queryKey() });
  };
  const upload = useMutation(orpc.uploadCelebrationPhoto.mutationOptions({ onSuccess: refreshPhotoData }));
  const updatePhoto = useMutation(orpc.organiserUpdatePhoto.mutationOptions({ onSuccess: () => { setEditingPhoto(null); setPhotoName(""); refreshPhotoData(); } }));
  const deletePhoto = useMutation(orpc.organiserDeletePhoto.mutationOptions({ onSuccess: refreshPhotoData }));

  if (!isOrganiser) {
    return <main className="mx-auto max-w-lg p-10"><h1 className="text-2xl font-semibold">Private organiser area</h1><p className="mt-3 text-muted-foreground">This RSVP dashboard is only available to Charlene.</p></main>;
  }

  const shownResponses = responses.data?.filter((response) => guestFilter === "ALL" || response.status === guestFilter) ?? [];
  const exportGuestList = () => {
    const rows = ["Name,Email,Response,Responded", ...responses.data?.map((response) => [response.user.name, response.user.email, response.status === "ATTENDING" ? "Able to attend" : "Unable to attend", new Date(response.updatedAt).toLocaleString()].map((value) => `"${value.replaceAll('"', '""')}"`).join(",")) ?? []];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "charlene-graduation-rsvps.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      if (!/image\/(jpeg|png|webp)/.test(file.type) || file.size > 2_500_000) continue;
      upload.mutate({ name: file.name, mimeType: file.type, data: await readFile(file) });
    }
    event.target.value = "";
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><p className="admin-eyebrow">Charlene’s graduation · private organiser space</p><h1>Good morning, Charlene.</h1><p className="admin-subtitle">A calm little corner to keep track of your celebration.</p></div>
        <button className="admin-logout" type="button" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } })}>Log out</button>
      </header>

      <section className="admin-stats" aria-label="Event overview">
        <Summary label="Guest accounts" value={overview.data?.guestCount ?? 0} tone="blue" />
        <Summary label="Joining you" value={overview.data?.attending ?? 0} tone="green" />
        <Summary label="Not able to make it" value={overview.data?.declined ?? 0} tone="red" />
        <Summary label="Still deciding" value={overview.data?.awaiting ?? 0} tone="gold" />
      </section>

      <section className="admin-content-grid">
        <article className="admin-panel guest-panel">
          <div className="admin-panel-heading"><div><p className="admin-kicker">RSVPs</p><h2>Your guest list</h2></div><button type="button" className="export-button" onClick={exportGuestList} disabled={!responses.data?.length}>Download CSV</button></div>
          <div className="guest-filters" aria-label="Filter guest list">
            {(["ALL", "ATTENDING", "DECLINED"] as const).map((filter) => <button key={filter} type="button" className={guestFilter === filter ? "is-selected" : ""} onClick={() => setGuestFilter(filter)}>{filter === "ALL" ? "All replies" : filter === "ATTENDING" ? "Attending" : "Unable to attend"}</button>)}
          </div>
          {responses.isLoading ? <p className="admin-empty">Loading your guest list…</p> : shownResponses.length ? <div className="guest-list">{shownResponses.map((response) => <article className="guest-row" key={response.user.email}><div className="guest-avatar">{response.user.name.slice(0, 1).toUpperCase()}</div><div className="guest-name"><strong>{response.user.name}</strong><span>{response.user.email}</span></div><div className="guest-response"><b className={response.status === "ATTENDING" ? "attending" : "declined"}>{response.status === "ATTENDING" ? "Able to attend" : "Unable to attend"}</b><small>{formatDate(response.updatedAt)}</small></div></article>)}</div> : <p className="admin-empty">{guestFilter === "ALL" ? "No RSVP replies yet — they will appear here as guests respond." : "No guests match this reply yet."}</p>}
        </article>

        <aside className="admin-aside">
          <article className="admin-panel admin-moments"><p className="admin-kicker">Shared moments</p><div className="moment-count"><strong>{overview.data?.photoCount ?? 0}</strong><span>photos shared</span></div><div className="moment-count"><strong>{overview.data?.messageCount ?? 0}</strong><span>guestbook messages</span></div><p className="admin-note">Photos and messages appear on the celebration page for every signed-in guest.</p></article>
          <article className="admin-panel latest-notes"><p className="admin-kicker">Latest notes</p><h2>Guestbook love</h2>{overview.data?.recentMessages.length ? <div>{overview.data.recentMessages.map((message) => <blockquote key={message.id}>“{message.message}”<footer>— {message.user.name}</footer></blockquote>)}</div> : <p className="admin-empty">Warm messages from guests will land here.</p>}</article>
        </aside>
      </section>

      <section className="admin-panel admin-photo-panel">
        <div className="admin-panel-heading"><div><p className="admin-kicker">Gallery control</p><h2>Manage photos</h2><p className="admin-panel-copy">Add your own photos, rename a file, or remove anything you do not want guests to see.</p></div><label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} disabled={upload.isPending} /><span>{upload.isPending ? "Uploading…" : "Add photos"}</span></label></div>
        <p className="admin-upload-help">JPG, PNG, or WebP · up to 2.5 MB each</p>
        {photos.isLoading ? <p className="admin-empty">Loading gallery…</p> : photos.data?.length ? <div className="admin-photo-grid">{photos.data.map((photo) => <article className="admin-photo" key={photo.id}><img src={`data:${photo.mimeType};base64,${photo.data}`} alt={photo.name} /><div className="admin-photo-info">{editingPhoto === photo.id ? <form onSubmit={(event) => { event.preventDefault(); if (photoName.trim()) updatePhoto.mutate({ id: photo.id, name: photoName.trim() }); }}><input value={photoName} onChange={(event) => setPhotoName(event.target.value)} maxLength={150} autoFocus /><div><button type="submit" disabled={updatePhoto.isPending}>Save</button><button type="button" onClick={() => setEditingPhoto(null)}>Cancel</button></div></form> : <><strong title={photo.name}>{photo.name}</strong><span>Shared by {photo.user.name} · {formatDate(photo.createdAt)}</span><div className="photo-admin-actions"><button type="button" onClick={() => { setEditingPhoto(photo.id); setPhotoName(photo.name); }}>Rename</button><button type="button" className="delete-photo" disabled={deletePhoto.isPending} onClick={() => { if (window.confirm(`Remove ${photo.name} from the celebration gallery?`)) deletePhoto.mutate({ id: photo.id }); }}>Remove</button></div></>}</div></article>)}</div> : <p className="admin-empty">No photos yet. Add the first one here, or wait for guests to share theirs.</p>}
      </section>
    </main>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "red" | "gold" }) {
  return <article className={`admin-stat ${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
