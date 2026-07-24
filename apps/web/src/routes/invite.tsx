import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invite")({
  component: InviteLayout,
});

function InviteLayout() {
  return <Outlet />;
}
