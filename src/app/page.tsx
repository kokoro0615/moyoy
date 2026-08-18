import { foundationContract, targetViewports } from "@/lib/foundation-contract";

export const dynamic = "force-static";

export default function FoundationPage() {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-3xl items-center px-6 py-16 sm:px-10"
      data-foundation-only="true"
    >
      <section aria-labelledby="foundation-title" className="w-full">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Internal preview
        </p>
        <h1
          className="mt-3 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl"
          id="foundation-title"
        >
          Implementation foundation
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-700">
          Production copy, approved visual references, and production assets are
          intentionally not configured.
        </p>

        <dl className="mt-10 grid gap-4 sm:grid-cols-2">
          <FoundationStatus
            label="Search indexing"
            value={foundationContract.searchIndexingAllowed ? "Allowed" : "Blocked"}
          />
          <FoundationStatus
            label="Approved content"
            value={foundationContract.approvedCopyConfigured ? "Configured" : "Blocked"}
          />
          <FoundationStatus
            label="Approved assets"
            value={
              foundationContract.approvedAssetsConfigured ? "Configured" : "Blocked"
            }
          />
          <FoundationStatus
            label="Reference viewports"
            value={targetViewports
              .map(({ height, width }) => `${width}×${height}`)
              .join(" · ")}
          />
        </dl>
      </section>
    </main>
  );
}

function FoundationStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
