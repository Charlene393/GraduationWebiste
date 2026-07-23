import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/invite")({ component: InvitePage });

function formatGuestName(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "Guest";
}

function InvitePage() {
  const { data: session, isPending } = authClient.useSession();
  const recipient = (new URLSearchParams(window.location.search).get("to")?.trim() || "Guest").replace(/^dear\s+/i, "");

  useEffect(() => {
    if (!isPending && !session) window.location.replace(`/login?to=${encodeURIComponent(recipient)}`);
  }, [isPending, recipient, session]);

  if (isPending || !session) return <main className="invitation-page"><p className="access-copy">Preparing your invitation…</p></main>;
  return <InvitationCard recipient={formatGuestName(session.user.name || recipient)} />;
}

function InvitationCard({ recipient }: { recipient: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const rsvp = useQuery(orpc.myRsvp.queryOptions());
  const updateRsvp = useMutation(orpc.updateRsvp.mutationOptions({
    onSuccess: (response) => {
      queryClient.setQueryData(orpc.myRsvp.queryKey(), response);
      toast.success(response.status === "ATTENDING" ? "Thank you — your attendance is confirmed!" : "Your response has been recorded.");
    },
  }));

  return <main className="invitation-page"><div className="ambient ambient-red" /><div className="ambient ambient-blue" /><div className="star-field" aria-hidden="true" />
    <section className={`invitation-scene ${isOpen ? "is-open" : ""}`}>
      <p className="scene-kicker">A special moment to celebrate</p>
      <button className="envelope" type="button" onClick={() => setIsOpen(true)} aria-label="Open your graduation invitation"><span className="envelope-back" /><span className="letter-preview" aria-hidden="true"><span>CHARLENE MBUGUA</span><i /></span><span className="envelope-flap" /><span className="envelope-front"><span className="envelope-address"><small>To</small><strong>{recipient}</strong><small>From Charlene Mbugua</small></span></span><span className="wax-seal" aria-hidden="true">Invite</span></button>
      <p className="open-prompt">{isOpen ? "Your invitation is open" : "Tap the seal to open"}</p>
      <article className="invitation-letter" aria-live="polite"><div className="letter-corner top-left" /><div className="letter-corner bottom-right" />
      <div className="letter-rule" /><p className="letter-eyebrow">Class of 2026</p><h1>Graduation Invitation</h1><p className="letter-greeting">Dear {recipient},</p>
      <p className="letter-copy">I am delighted to invite you to celebrate my graduation — the joyful close of one chapter and the beginning of another.</p>
      <div className="event-details"><div><span>Date</span><strong>15/08/2026</strong></div>
      <div><span>Venue</span><strong>To be announced</strong></div></div>
      <p className="letter-close">Your presence would make this joyous occasion even more special. I would be honoured to celebrate it with you.</p><p className="signature">Charlene Mbugua</p>
      <div className="rsvp-panel"><p>{rsvp.data?.status === "ATTENDING" ? "Attendance confirmed" : rsvp.data?.status === "DECLINED" ? "Unable to attend" : "Will you be joining us?"}</p>
      <div><button type="button" className="rsvp-yes" disabled={updateRsvp.isPending} onClick={() => updateRsvp.mutate({ status: "ATTENDING" })}>Able to</button>
      <button type="button" className="rsvp-no" disabled={updateRsvp.isPending} onClick={() => updateRsvp.mutate({ status: "DECLINED" })}>Unable to attend</button></div></div></article>
    </section>
  </main>;
}
