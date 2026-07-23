import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <main className="invitation-page auth-page">
      <div className="ambient ambient-red" />
      <div className="ambient ambient-blue" />
      <section className="auth-card">
        <p className="scene-kicker">Charlene Mbugua · Graduation 2026</p>
        <p className="auth-intro">{showSignIn ? "Sign in to open your invitation." : "Create an account to receive your invitation."}</p>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </section>
    </main>
  );
}
