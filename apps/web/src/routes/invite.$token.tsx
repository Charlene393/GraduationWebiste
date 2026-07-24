import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/invite/$token")({ component: GuestInvitePage });

function GuestInvitePage() {
  const { token } = Route.useParams();
  const invitation = useQuery(orpc.guestInvitation.queryOptions({ input: { token } }));
  const updateRsvp = useMutation(orpc.updateGuestRsvp.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.guestInvitation.queryKey({ input: { token } }) }) }));
  const [isOpen, setIsOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (invitation.data?.rsvpStatus === "ATTENDING" && !celebrating) {
      window.location.replace(`/celebration/${token}`);
    }
  }, [celebrating, invitation.data?.rsvpStatus, token]);

  if (invitation.isLoading) return <main className="invitation-page"><p className="access-copy">Preparing your invitation…</p></main>;
  if (!invitation.data) return <main className="invitation-page"><section className="invitation-access"><h1>This invitation link is not available.</h1><p className="access-copy">Please ask Charlene to send you a new invitation link.</p></section></main>;
  const rsvp = invitation.data.rsvpStatus;
  const respond = (status: "ATTENDING" | "DECLINED") => updateRsvp.mutate({ token, status }, { onSuccess: () => {
    if (status === "ATTENDING") {
      setCelebrating(true);
      window.setTimeout(() => window.location.assign(`/celebration/${token}`), 3600);
    } else {
      setDeclined(true);
    }
  } });

  return <main className="invitation-page"><div className="ambient ambient-red" /><div className="ambient ambient-blue" /><div className="star-field" aria-hidden="true" />
    {celebrating && <div className="celebration" aria-live="assertive"><div className="balloons" aria-hidden="true"><span>🎈</span><span>🎈</span><span>🎈</span></div><div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <span key={index} />)}</div><p>Hooray! We can’t wait to celebrate with you.</p></div>}
    {declined && <div className="decline-overlay" role="dialog" aria-modal="true"><div className="decline-message"><span className="sad-face">☹</span><h2>We’ll miss you!</h2><p>Thank you for letting Charlene know. Sending you lots of love.</p><button type="button" onClick={() => setDeclined(false)}>Send love back</button></div></div>}
    <section className={`invitation-scene ${isOpen ? "is-open" : ""}`}><p className="scene-kicker">A special moment to celebrate</p>
      <button className="envelope" type="button" onClick={() => setIsOpen(true)} aria-label="Open your graduation invitation"><span className="envelope-back" /><span className="letter-preview" aria-hidden="true"><span>CHARLENE MBUGUA</span><i /></span><span className="envelope-flap" /><span className="envelope-front"><span className="envelope-address"><small>To</small><strong>{formatName(invitation.data.name)}</strong><small>From Charlene Mbugua</small></span></span><span className="wax-seal" aria-hidden="true">Invite</span></button>
      <p className="open-prompt">{isOpen ? "Your invitation is open" : "Tap the seal to open"}</p>
      <article className="invitation-letter"><div className="letter-corner top-left" /><div className="letter-corner bottom-right" /><div className="letter-rule" /><p className="letter-eyebrow">Class of 2026</p><h1>Graduation Invitation</h1><p className="letter-greeting">Dear {formatName(invitation.data.name)},</p><p className="letter-copy">I am delighted to invite you to celebrate my graduation — the joyful close of one chapter and the beginning of another.</p><div className="event-details"><div><span>Date</span><strong>15/08/2026</strong></div><div><span>Venue</span><strong>Home</strong></div></div><p className="letter-close">Your presence would make this joyous occasion even more special. I would be honoured to celebrate it with you.</p><p className="signature">Charlene Mbugua</p><div className="rsvp-panel"><p>{rsvp === "ATTENDING" ? "Your attendance is confirmed!" : rsvp === "DECLINED" ? "We’ll be thinking of you." : "Will you be joining us?"}</p><div><button type="button" className="rsvp-yes" disabled={updateRsvp.isPending || Boolean(rsvp)} onClick={() => respond("ATTENDING")}>Able to attend</button><button type="button" className="rsvp-no" disabled={updateRsvp.isPending || Boolean(rsvp)} onClick={() => respond("DECLINED")}>Unable to attend</button></div></div></article>
    </section>
  </main>;
}

function formatName(name: string) { const value = name.trim(); return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Guest"; }
