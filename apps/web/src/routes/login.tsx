import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const isAdminSetup = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("setup") === "admin";
  const [showSignIn, setShowSignIn] = useState(!isAdminSetup);

  return (
    <main className="invitation-page auth-page">
      <div className="ambient ambient-red" />
      <div className="ambient ambient-blue" />
      <section className="auth-card">
        <p className="scene-kicker">Charlene Mbugua · Graduation 2026</p>
        <p className="auth-intro">{showSignIn ? "Sign in to open your invitation." : isAdminSetup ? "Set up your private organiser account once, then sign in normally from then on." : "Create an account to receive your invitation."}</p>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm adminSetup={isAdminSetup} onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </section>
    </main>
  );
}
