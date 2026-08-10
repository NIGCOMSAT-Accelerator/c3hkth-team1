import { redirect } from "next/navigation";

import { RiskPill } from "@/components/RiskPill";
import { createClient } from "@/lib/supabase/server";

const SECTIONS = [
  { id: "what-is-this", label: "What AquaWatch does" },
  { id: "your-pages", label: "Your dashboard pages" },
  { id: "risk-levels", label: "Understanding risk levels" },
  { id: "getting-alerts", label: "How alerts reach you" },
  { id: "settings", label: "Changing your alert sensitivity" },
  { id: "satellite-image", label: "Viewing the satellite image" },
  { id: "faq", label: "Common questions" },
];

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink/8 py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate">{children}</div>
    </section>
  );
}

export default async function GuidePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <p className="eyebrow text-flood">Guide</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Getting started with AquaWatch</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-soft">
        This page explains what everything in your dashboard means and how to use it. If you&apos;re
        ever unsure what a screen is telling you, come back here.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">On this page</p>
          <ul className="mt-3 space-y-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-sm text-flood hover:underline">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-2xl rounded-[var(--radius-card)] border border-ink/8 bg-white px-6 shadow-[var(--shadow-panel)]">
          <GuideSection id="what-is-this" title="What AquaWatch does">
            <p>
              AquaWatch watches for flooding using satellite images, and combines that with rainfall
              data to work out how likely a ward is to see a malaria outbreak in the coming weeks.
              Standing water after a flood is where mosquitoes breed — so spotting the water early
              means health workers can act before people start getting sick, not after.
            </p>
            <p>
              Every ward gets a <strong>risk score</strong>, updated regularly. When a ward&apos;s risk
              crosses a certain point, the health worker responsible for that ward gets an alert by
              text message, WhatsApp, or email.
            </p>
          </GuideSection>

          <GuideSection id="your-pages" title="Your dashboard pages">
            <p>Here&apos;s what each page in the sidebar is for:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Overview</strong> — a quick snapshot: how many wards you&apos;re watching, which
                ones are highest risk right now, and the most recent alerts sent.
              </li>
              <li>
                <strong>Ward risk</strong> — the full list of every ward you have access to, with its
                current risk score. You can search, filter by risk level, and sort by clicking any
                column heading.
              </li>
              <li>
                <strong>Notifications</strong> — a complete history of every alert that&apos;s been sent,
                including which channel it went out on and whether it was delivered successfully.
              </li>
              <li>
                <strong>Analytics</strong> — charts showing risk trends and alert activity over the last
                couple of weeks.
              </li>
              <li>
                <strong>Settings</strong> — where you can adjust how sensitive alerts are for the wards
                you look after.
              </li>
              <li>
                <strong>Audit log</strong> — a record of significant actions across the whole system.
                This one is only visible to government accounts.
              </li>
            </ul>
          </GuideSection>

          <GuideSection id="risk-levels" title="Understanding risk levels">
            <p>Every ward is given one of three risk levels, shown as a coloured label:</p>
            <div className="flex flex-wrap gap-3 py-2">
              <RiskPill level="low" />
              <RiskPill level="moderate" />
              <RiskPill level="high" />
            </div>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Low</strong> — conditions don&apos;t currently suggest elevated malaria risk. No
                action needed.
              </li>
              <li>
                <strong>Moderate</strong> — worth keeping an eye on. Conditions are trending toward risk
                but haven&apos;t crossed the alert threshold yet.
              </li>
              <li>
                <strong>High</strong> — standing water and rainfall patterns suggest real outbreak risk.
                This is when alerts are sent and it&apos;s worth preparing nets and larvicide.
              </li>
            </ul>
            <p>
              You may also see <strong>&quot;Pending data&quot;</strong> next to a ward — that just means
              we don&apos;t have a current reading for it yet, not that anything is wrong.
            </p>
          </GuideSection>

          <GuideSection id="getting-alerts" title="How alerts reach you">
            <p>
              Alerts can go out three ways: text message (SMS), WhatsApp, and email. Which ones you
              actually receive depends on what you gave when you signed up:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Text message</strong> — sent to the phone number you registered with. This
                always happens if you have a phone number on file.
              </li>
              <li>
                <strong>WhatsApp</strong> — only sent if you told us your number is on WhatsApp when you
                signed up. If you left that box unchecked, you&apos;ll still get everything by SMS and
                email — you just won&apos;t get a WhatsApp copy.
              </li>
              <li>
                <strong>Email</strong> — sent to the email address on your account.
              </li>
            </ul>
            <p>
              If you&apos;re not receiving alerts at all, the most likely reason is that your phone
              number wasn&apos;t added when you signed up. Contact your administrator to have it added.
            </p>
          </GuideSection>

          <GuideSection id="settings" title="Changing your alert sensitivity">
            <p>
              By default, alerts fire once a ward&apos;s risk score reaches a standard level set for
              the whole system. If you&apos;d rather be alerted earlier (or only for more serious
              situations), go to <strong>Settings</strong> and turn on &quot;Use a custom
              threshold.&quot; Drag the slider — a lower number means you&apos;ll get alerted sooner, a
              higher number means only more severe situations will trigger an alert for your wards.
            </p>
            <p>
              If you don&apos;t set anything, the system default is used automatically — you don&apos;t
              need to change anything unless you want to.
            </p>
          </GuideSection>

          <GuideSection id="satellite-image" title="Viewing the satellite image">
            <p>
              On the <strong>Ward risk</strong> page, each row has a &quot;View image&quot; button. This
              opens the actual satellite picture used to detect standing water for that ward — blue
              areas show where water has been detected. If no image is available yet for a ward, the
              window will say so; images are generated periodically, not instantly on demand.
            </p>
          </GuideSection>

          <GuideSection id="faq" title="Common questions">
            <p>
              <strong>I signed up but I&apos;m not seeing any wards.</strong> Government accounts see
              every ward. LGA and ward accounts only see the wards inside their own area — if you
              expected to see more, check that the correct LGA or ward was selected when you signed
              up.
            </p>
            <p>
              <strong>An alert said &quot;failed&quot; — what does that mean?</strong> It means the
              message couldn&apos;t be delivered on that particular channel, usually a temporary issue
              with the phone number or network. Check the <strong>Notifications</strong> page for the
              reason shown next to that alert.
            </p>
            <p>
              <strong>Can I get alerts for a ward that isn&apos;t mine?</strong> Not directly — alerts
              go to whoever is registered for that specific ward or LGA. If you need visibility into a
              different area, speak to your administrator about your account&apos;s access level.
            </p>
          </GuideSection>
        </div>
      </div>
    </div>
  );
}
