import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Columns3,
  Zap,
  ShieldCheck,
  Link2,
  Command,
  Rocket,
  Cloud,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TackMark from "@/components/TackMark";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) redirect("/boards");

  return <LandingPage />;
}

const MAX = 1080;

function LandingPage() {
  return (
    <div
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        minHeight: "100vh",
        fontFamily:
          "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          borderBottom: "1px solid var(--hairline)",
          background: "color-mix(in srgb, var(--paper) 80%, transparent)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: MAX,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TackMark size={26} withWordmark />
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <a
              href="#options"
              style={navLinkStyle}
            >
              Pricing
            </a>
            <a
              href="https://github.com/aaali/tack"
              target="_blank"
              rel="noopener noreferrer"
              style={navLinkStyle}
            >
              GitHub
            </a>
            <Link href="/login" style={navLinkStyle}>
              Sign in
            </Link>
            <Link href="/login" style={primaryButtonStyle(13, "8px 16px")}>
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: MAX,
          margin: "0 auto",
          padding: "104px 24px 88px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 72,
          alignItems: "center",
        }}
        className="hero-grid"
      >
        <div className="fade-up">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 999,
              padding: "5px 12px 5px 8px",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                background: "var(--pin)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 999,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "var(--font-space-mono), monospace",
              }}
            >
              Open source
            </span>
            <span style={{ fontSize: 13, color: "var(--slate)" }}>
              Self-host it, or let us run it.
            </span>
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: "clamp(40px, 5.2vw, 62px)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: 22,
              color: "var(--ink)",
            }}
          >
            The board your
            <br />
            team actually{" "}
            <span style={{ color: "var(--pin)" }}>owns.</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--slate)",
              maxWidth: 460,
              marginBottom: 36,
            }}
          >
            A focused Kanban board with no busywork and no lock-in. Run it free
            on your own Supabase, or start on Tack Cloud in seconds — same
            product, your choice.
          </p>

          <div
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            <Link href="/login" style={primaryButtonStyle(15, "13px 26px")}>
              Start free on Tack Cloud
              <ArrowRight size={16} />
            </Link>
            <a
              href="#options"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--ink)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 14,
                padding: "13px 18px",
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                background: "var(--surface)",
              }}
            >
              Compare options
            </a>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginTop: 40,
              paddingTop: 32,
              borderTop: "1px solid var(--hairline)",
            }}
          >
            {[
              ["Magic-link login", "No passwords"],
              ["Real-time", "Every teammate, instantly"],
              ["RLS secure", "Row-level security"],
            ].map(([label, sub]) => (
              <div key={label}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                  {label}
                </p>
                <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 3 }}>
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Board mockup */}
        <div className="fade-up fade-up-delay-2" style={{ position: "relative" }}>
          <BoardMockup />
        </div>
      </section>

      {/* Stats strip */}
      <div
        style={{
          borderTop: "1px solid var(--hairline)",
          borderBottom: "1px solid var(--hairline)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            maxWidth: MAX,
            margin: "0 auto",
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 56,
            flexWrap: "wrap",
          }}
        >
          {[
            ["5 min", "From clone to running"],
            ["$0", "Free tier covers most teams"],
            ["MIT", "Open source — fork it"],
          ].map(([stat, sub]) => (
            <div key={stat} style={{ textAlign: "center" }}>
              <p
                className="font-display"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {stat}
              </p>
              <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 2 }}>
                {sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ maxWidth: MAX, margin: "0 auto", padding: "104px 24px" }}>
        <Eyebrow>Why Tack</Eyebrow>
        <SectionHeading>
          Everything you need. Nothing you don&apos;t.
        </SectionHeading>
        <SectionSub>
          Tack is deliberately small. Every feature earns its place by helping
          the team ship — not by filling a changelog.
        </SectionSub>

        <div
          className="features-grid"
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--hairline)",
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--surface)",
                padding: "32px 28px",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--wash)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  color: "var(--pin)",
                }}
              >
                <f.icon size={18} strokeWidth={1.75} />
              </div>
              <h3
                className="font-display"
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--slate)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Two options */}
      <section
        id="options"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--hairline)",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <div style={{ maxWidth: MAX, margin: "0 auto", padding: "104px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <Eyebrow center>Two ways to run it</Eyebrow>
            <SectionHeading center>Self-host, or let us host it.</SectionHeading>
            <SectionSub center>
              Same code, same features. Own every byte on your own
              infrastructure, or skip the setup entirely.
            </SectionSub>
          </div>

          <div
            className="options-grid"
            style={{
              marginTop: 56,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              maxWidth: 860,
              margin: "56px auto 0",
              alignItems: "stretch",
            }}
          >
            {/* Self-host */}
            <PlanCard
              icon={<GithubIcon />}
              eyebrow="Open source"
              name="Self-hosted"
              price="$0"
              priceSub="forever"
              blurb="Run it on your own Supabase + Cloudflare. Your data never leaves your infrastructure."
              features={[
                "Full source under the MIT license",
                "Your own Supabase database",
                "Unlimited everything — it's yours",
                "Deploy in ~5 minutes from the README",
                "Community support on GitHub",
              ]}
              cta="View on GitHub"
              ctaHref="https://github.com/aaali/tack"
              ctaExternal
              variant="ghost"
            />

            {/* Hosted */}
            <PlanCard
              icon={<Cloud size={20} strokeWidth={1.75} />}
              eyebrow="Tack Cloud"
              name="Hosted"
              price="Free"
              priceSub="to start"
              blurb="We run the infrastructure. You sign in and start moving cards in seconds — no setup."
              features={[
                "Unlimited projects",
                "Unlimited team members",
                "Managed updates, backups & uptime",
                "Magic-link login out of the box",
                "Priority support",
              ]}
              cta="Start for free"
              ctaHref="/login"
              variant="featured"
              badge="No setup"
            />
          </div>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "var(--slate)",
              marginTop: 28,
            }}
          >
            Start on the cloud and move to self-hosted later — your data exports
            cleanly, always.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: MAX, margin: "0 auto", padding: "104px 24px" }}>
        <div style={{ textAlign: "center" }}>
          <Eyebrow center>Getting started</Eyebrow>
          <SectionHeading center>Up and running in minutes</SectionHeading>
          <SectionSub center>
            No Kubernetes, no ops team, no credit card required.
          </SectionSub>
        </div>

        <div
          className="steps-grid"
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }}
        >
          {steps.map((s, i) => (
            <div key={s.title}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: i === 0 ? "var(--pin)" : "var(--surface)",
                    color: i === 0 ? "#fff" : "var(--slate)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontWeight: 700,
                    fontSize: 13,
                    border: i !== 0 ? "1px solid var(--hairline)" : "none",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{ flex: 1, height: 1, background: "var(--hairline)" }}
                />
              </div>
              <h3
                className="font-display"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 8,
                }}
              >
                {s.title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.6 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA — intentionally always-dark card; text colours are fixed
          against the dark background and must not change with the theme. */}
      <section
        style={{
          maxWidth: MAX,
          margin: "0 auto",
          padding: "0 24px 104px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#1B1B1F",
            borderRadius: 24,
            padding: "80px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--pin)",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--pin)",
              opacity: 0.5,
            }}
          />
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(30px, 4vw, 46px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#F6F5F2",
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Your board. Your data.
            <br />
            <span style={{ color: "var(--pin)" }}>No asterisks.</span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "#9e9ea8",
              maxWidth: 440,
              margin: "0 auto 36px",
              lineHeight: 1.6,
            }}
          >
            Pick the path that fits — start free on the cloud, or fork the repo
            and host it yourself. Either way, no subscriptions on your privacy.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/login" style={primaryButtonStyle(16, "14px 30px")}>
              Start for free
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com/aaali/tack"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#F6F5F2",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 16,
                padding: "14px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <GithubIcon />
              Self-host it
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--hairline)", padding: "32px 24px" }}>
        <div
          style={{
            maxWidth: MAX,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <TackMark size={20} withWordmark />
          <p style={{ fontSize: 13, color: "var(--slate)" }}>
            Open source under the MIT License.{" "}
            <a
              href="https://github.com/aaali/tack"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--slate)", textDecoration: "underline" }}
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 880px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .options-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ---- Shared style helpers ----

const navLinkStyle = {
  fontSize: 14,
  color: "var(--slate)",
  textDecoration: "none",
  fontWeight: 500,
} as const;

function primaryButtonStyle(fontSize: number, padding: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "var(--pin)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
    fontSize,
    padding,
    borderRadius: 12,
    lineHeight: 1,
    letterSpacing: "-0.01em",
  } as const;
}

// ---- Section primitives ----

function Eyebrow({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <p
      style={{
        fontFamily: "var(--font-space-mono), monospace",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--pin)",
        marginBottom: 14,
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </p>
  );
}

function SectionHeading({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <h2
      className="font-display"
      style={{
        fontSize: "clamp(28px, 3.5vw, 40px)",
        fontWeight: 700,
        letterSpacing: "-0.03em",
        color: "var(--ink)",
        lineHeight: 1.1,
        textAlign: center ? "center" : "left",
        maxWidth: center ? 560 : undefined,
        margin: center ? "0 auto" : undefined,
      }}
    >
      {children}
    </h2>
  );
}

function SectionSub({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <p
      style={{
        fontSize: 16,
        lineHeight: 1.6,
        color: "var(--slate)",
        marginTop: 14,
        maxWidth: 520,
        textAlign: center ? "center" : "left",
        margin: center ? "14px auto 0" : "14px 0 0",
      }}
    >
      {children}
    </p>
  );
}

// ---- Plan card ----

function PlanCard({
  icon,
  eyebrow,
  name,
  price,
  priceSub,
  blurb,
  features,
  cta,
  ctaHref,
  ctaExternal,
  variant,
  badge,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  name: string;
  price: string;
  priceSub: string;
  blurb: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaExternal?: boolean;
  variant: "ghost" | "featured";
  badge?: string;
}) {
  const featured = variant === "featured";
  const ctaProps = ctaExternal
    ? { href: ctaHref, target: "_blank", rel: "noopener noreferrer" }
    : { href: ctaHref };
  const CtaTag = ctaExternal ? "a" : Link;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
        border: featured
          ? "1.5px solid var(--pin)"
          : "1px solid var(--hairline)",
        borderRadius: 20,
        padding: "32px 28px",
        boxShadow: featured
          ? "0 16px 40px color-mix(in srgb, var(--pin) 14%, transparent)"
          : "none",
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -11,
            right: 24,
            background: "var(--pin)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            fontFamily: "var(--font-space-mono), monospace",
          }}
        >
          {badge}
        </span>
      )}

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: featured ? "var(--pin)" : "var(--ink)",
          marginBottom: 18,
        }}
      >
        {icon}
      </div>

      <p
        style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--slate)",
          marginBottom: 6,
        }}
      >
        {eyebrow}
      </p>
      <h3
        className="font-display"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
        }}
      >
        {name}
      </h3>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
        <span
          className="font-display"
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.03em",
          }}
        >
          {price}
        </span>
        <span style={{ fontSize: 14, color: "var(--slate)" }}>{priceSub}</span>
      </div>

      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--slate)",
          marginTop: 14,
          minHeight: 66,
        }}
      >
        {blurb}
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "20px 0 28px",
          display: "flex",
          flexDirection: "column",
          gap: 11,
          flex: 1,
        }}
      >
        {features.map((feat) => (
          <li
            key={feat}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 14,
              color: "var(--ink)",
              lineHeight: 1.45,
            }}
          >
            <Check
              size={16}
              strokeWidth={2.5}
              style={{ color: "var(--pin)", marginTop: 1, flexShrink: 0 }}
            />
            {feat}
          </li>
        ))}
      </ul>

      <CtaTag
        {...ctaProps}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 15,
          padding: "13px 20px",
          borderRadius: 12,
          letterSpacing: "-0.01em",
          ...(featured
            ? { background: "var(--pin)", color: "#fff" }
            : {
                background: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--hairline)",
              }),
        }}
      >
        {!featured && ctaExternal && <GithubIcon />}
        {cta}
        {featured && <ArrowRight size={16} />}
      </CtaTag>
    </div>
  );
}

// ---- Static data ----

const features = [
  {
    icon: Columns3,
    title: "One board per team",
    desc: "No nested projects, no permission matrices. A board is a team. Move cards, not org charts.",
  },
  {
    icon: Zap,
    title: "Real-time, always",
    desc: "Supabase Realtime means your team sees the same board simultaneously — no refresh button.",
  },
  {
    icon: ShieldCheck,
    title: "Row-level security",
    desc: "Every query goes through Postgres RLS. Non-members literally can't see your data.",
  },
  {
    icon: Link2,
    title: "Magic-link login",
    desc: "No passwords to reset, no SSO to configure. Just an email and a link.",
  },
  {
    icon: Command,
    title: "Keyboard-first",
    desc: "⌘K finds any card. C creates one. / searches. A power user never touches the mouse.",
  },
  {
    icon: Rocket,
    title: "Deploy in minutes",
    desc: "One Supabase project, one Cloudflare Worker. The README gets you there in under five minutes.",
  },
];

const steps = [
  {
    title: "Create a project",
    desc: "On Tack Cloud it's instant. Self-hosting? A Supabase free project takes 90 seconds.",
  },
  {
    title: "Deploy (or skip it)",
    desc: "One Cloudflare command to self-host — or nothing at all on the cloud.",
  },
  {
    title: "Invite your team",
    desc: "Add members by email. They click the magic link and they're in.",
  },
  {
    title: "Ship work",
    desc: "Drag cards. Track progress. Own your data. That's all it is.",
  },
];

// ---- GitHub glyph (no lucide equivalent at this weight) ----

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// ---- Board mockup ----

function BoardMockup() {
  const cols = [
    {
      title: "Backlog",
      cards: [
        { label: "ENG-12", title: "Auth email template", priority: "#3B73C4", assignee: "A" },
        { label: "ENG-13", title: "Mobile responsive fixes", priority: "#E0A33B", assignee: "B" },
      ],
    },
    {
      title: "In Progress",
      cards: [
        { label: "ENG-14", title: "Command palette search", priority: "#E14B3B", assignee: "C" },
        { label: "ENG-15", title: "Dark mode toggle", priority: "#3FA66A", assignee: "A" },
      ],
    },
    {
      title: "Done",
      cards: [
        { label: "ENG-11", title: "RLS policy audit", priority: "#3FA66A", assignee: "B" },
      ],
    },
  ];

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        border: "1px solid var(--hairline)",
        boxShadow:
          "0 24px 64px rgba(27,27,31,0.12), 0 4px 16px rgba(27,27,31,0.06)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Mockup top bar */}
      <div
        style={{
          height: 44,
          borderBottom: "1px solid var(--hairline)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: "var(--paper)",
            borderRadius: 6,
            height: 24,
            maxWidth: 200,
            margin: "0 auto",
          }}
        />
      </div>

      {/* Mockup board */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 14,
          background: "var(--paper)",
          overflowX: "hidden",
        }}
      >
        {cols.map((col) => (
          <div
            key={col.title}
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--surface)",
              borderRadius: 12,
              border: "1px solid var(--hairline)",
              padding: 10,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--slate)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
                fontFamily: "var(--font-space-mono), monospace",
              }}
            >
              {col.title}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {col.cards.map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: "var(--wash)",
                    borderRadius: 8,
                    padding: "8px 9px",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: card.priority,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--slate)",
                        fontFamily: "var(--font-space-mono), monospace",
                      }}
                    >
                      {card.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink)", lineHeight: 1.4, fontWeight: 500 }}>
                    {card.title}
                  </p>
                  <div
                    style={{
                      marginTop: 6,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "var(--pin)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {card.assignee}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
