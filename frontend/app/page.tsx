import Link from "next/link";

import { RiskContourSignal } from "@/components/RiskContourSignal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { StatCard } from "@/components/StatCard";

export default function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-ink text-mist">
        <div className="contour-field" aria-hidden="true" />
        <SiteNav />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-28 pt-40 text-center">
          <p className="eyebrow text-signal">Public health intelligence · Nigeria</p>

          <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Standing water is visible from orbit,
            <br />
            weeks before the fever is.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-mist/75">
            AquaWatch fuses satellite flood detection with rainfall and population data to predict
            malaria risk by ward, then alerts the health worker who can act on it — before the outbreak,
            not after.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-signal px-6 py-3 text-sm font-semibold text-ink transition hover:bg-signal-soft"
            >
              Request access
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-mist/25 px-6 py-3 text-sm font-medium text-mist transition hover:border-mist/50"
            >
              See how it works
            </a>
          </div>

          <div className="relative mt-20 h-[320px] w-[320px] sm:h-[420px] sm:w-[420px]">
            <RiskContourSignal className="h-full w-full" />
          </div>
        </div>
      </section>

      <section className="bg-mist px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow text-flood">The gap</p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Nigeria carries 27% of the world&apos;s malaria cases.
              <br />
              Its surveillance still starts at the clinic door.
            </h2>
          </div>
          <div className="space-y-5 text-base text-slate">
            <p>
              Flooding precedes a malaria outbreak by four to six weeks — mosquitoes breed in the
              standing water it leaves behind. That water is visible in satellite radar long before a
              single case is reported.
            </p>
            <p>
              Nigeria has malaria surveillance and it has flood monitoring. It has nothing that connects
              the two into a warning a ward health worker receives ahead of time, on a phone that already
              works for them.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative overflow-hidden bg-ink px-6 py-24 text-mist">
        <div className="contour-field" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl">
          <p className="eyebrow text-signal">How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
            One pipeline, three stages, run every week for every ward.
          </h2>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Detect",
                body: "Sentinel-1 radar reads standing water extent per ward — it sees through cloud cover, so the rainy season doesn't blind it.",
              },
              {
                step: "02",
                title: "Predict",
                body: "A trained model fuses water extent, rainfall anomaly, and population density into a risk score and a lead-time window.",
              },
              {
                step: "03",
                title: "Alert",
                body: "When a ward crosses threshold, its registered CHEW or LGA coordinator gets a plain-language SMS or WhatsApp alert.",
              },
            ].map((item) => (
              <div key={item.step} className="border-t border-mist/15 pt-6">
                <span className="font-data text-sm text-signal">{item.step}</span>
                <h3 className="mt-3 font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm text-mist/70">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="bg-mist px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-flood">Why it matters</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold text-ink sm:text-4xl">
            The lead time is the intervention.
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            <StatCard value="27%" label="of global malaria cases are in Nigeria" detail="WHO, most recent estimate" />
            <StatCard value="4–6 wks" label="typical lag from flood to outbreak" detail="the window this system targets" />
            <StatCard value="0" label="deployed satellite-to-SMS malaria systems in Nigeria today" detail="the gap this closes" />
          </div>
        </div>
      </section>

      <section className="bg-ink px-6 py-24 text-center text-mist">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Get your LGA&apos;s wards on the risk map.
          </h2>
          <p className="mt-4 text-mist/70">
            Register as a health coordinator to see ward-level risk and receive alerts before the season
            turns.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-signal px-6 py-3 text-sm font-semibold text-ink transition hover:bg-signal-soft"
          >
            Request access
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
