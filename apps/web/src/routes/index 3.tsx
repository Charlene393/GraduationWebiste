import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/index 3")({
  component: Invitation,
});

function recipientFromUrl() {
  const recipient = new URLSearchParams(window.location.search).get("to");
  return recipient?.trim() || "Dear Guest";
}

function Invitation() {
  const [isOpen, setIsOpen] = useState(false);
  const recipient = recipientFromUrl();

  return (
    <main className="invitation-page">
      <div className="ambient ambient-red" />
      <div className="ambient ambient-blue" />
      <div className="star-field" aria-hidden="true" />

      <section className={`invitation-scene ${isOpen ? "is-open" : ""}`}>
        <p className="scene-kicker">A special moment to celebrate</p>

        <button
          className="envelope"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open your graduation invitation"
        >
          <span className="envelope-back" />
          <span className="letter-preview" aria-hidden="true">
            <span>CHARLENE MBUGUA</span>
            <i />
          </span>
          <span className="envelope-flap" />
          <span className="envelope-front">
            <span className="envelope-address">
              <small>To</small>
              <strong>{recipient}</strong>
              <small>From Charlene Mbugua</small>
            </span>
          </span>
          <span className="wax-seal" aria-hidden="true">Invite</span>
        </button>

        <p className="open-prompt">{isOpen ? "Your invitation is open" : "Tap the seal to open"}</p>

        <article className="invitation-letter" aria-live="polite">
          <div className="letter-corner top-left" />
          <div className="letter-corner bottom-right" />
          <p className="letter-eyebrow">Class of 2026</p>
          <div className="letter-rule" />
          <h1>Graduation Invitation</h1>
          <p className="letter-greeting">Dear {recipient},</p>
          <p className="letter-copy">
            I am delighted to invite you to celebrate my graduation — the joyful close of one chapter and the beginning of another.
          </p>
          <div className="event-details">
            <div><span>Date</span><strong>15/08/2026</strong></div>
            <div><span>Venue</span><strong>To be announced</strong></div>
          </div>
          <p className="letter-close">Your presence would make this joyous occasion even more special. I would be honoured to celebrate it with you.</p>
          <p className="signature">Charlene Mbugua</p>
          <button className="close-letter" type="button" onClick={() => setIsOpen(false)}>
            Close invitation
          </button>
        </article>
      </section>
    </main>
  );
}
