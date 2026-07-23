import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

const ORGANISER_EMAIL = "mbuguacharlene@gmail.com";

export const Route = createFileRoute("/_auth/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { session } = Route.useRouteContext();
  const isOrganiser = session.data?.user.email === ORGANISER_EMAIL;
  const responses = useQuery({ ...orpc.organiserRsvps.queryOptions(), enabled: isOrganiser });

  if (!isOrganiser) {
    return <main className="mx-auto max-w-lg p-10"><h1 className="text-2xl font-semibold">Private organiser area</h1><p className="mt-3 text-muted-foreground">This RSVP dashboard is only available to Charlene.</p></main>;
  }

  const attending = responses.data?.filter((response) => response.status === "ATTENDING").length ?? 0;
  const declined = responses.data?.filter((response) => response.status === "DECLINED").length ?? 0;

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <p className="text-sm font-medium text-red-700">Charlene’s graduation · organiser view</p>
      <h1 className="mt-1 text-3xl font-bold">RSVP responses</h1>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Summary label="Total responses" value={responses.data?.length ?? 0} />
        <Summary label="Attending" value={attending} />
        <Summary label="Unable to attend" value={declined} />
      </div>
      <div className="mt-8 overflow-hidden rounded-xl border bg-background">
        <div className="border-b p-4 font-semibold">Guest list</div>
        {responses.isLoading ? <p className="p-4 text-muted-foreground">Loading responses…</p> : responses.data?.length ? (
          <div className="divide-y">
            {responses.data.map((response) => (
              <div className="grid gap-1 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={response.user.email}>
                <div><p className="font-medium">{response.user.name}</p><p className="text-sm text-muted-foreground">{response.user.email}</p></div>
                <div className="text-left sm:text-right"><p className={response.status === "ATTENDING" ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{response.status === "ATTENDING" ? "Attending" : "Unable to attend"}</p><p className="text-xs text-muted-foreground">Updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(response.updatedAt))}</p></div>
              </div>
            ))}
          </div>
        ) : <p className="p-4 text-muted-foreground">No RSVPs have been submitted yet.</p>}
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-background p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>;
}
