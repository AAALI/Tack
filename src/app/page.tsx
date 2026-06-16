import { redirect } from "next/navigation";
import Link from "next/link";
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

function LandingPage() {
  return (
    <div
      style={{
        background: "#F6F5F2",
        color: "#1B1B1F",
        minHeight: "100vh",
        fontFamily:
          "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          borderBottom: "1px solid #E6E5E1",
          background: "rgba(246,245,242,0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TackMark size={26} withWordmark />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                color: "#6E6E78",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                background: "#E14B3B",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 500,
                padding: "8px 18px",
                borderRadius: 10,
                lineHeight: 1,
              }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "96px 24px 80px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
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
              background: "#fff",
              border: "1px solid #E6E5E1",
              borderRadius: 999,
              padding: "5px 12px 5px 8px",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                background: "#E14B3B",
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
            <span style={{ fontSize: 13, color: "#6E6E78" }}>
              Self-hosted · Your data · Forever free
            </span>
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: "clamp(40px, 5vw, 60px)",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: 20,
              color: "#1B1B1F",
            }}
          >
            The board your
            <br />
            team actually{" "}
            <span style={{ color: "#E14B3B" }}>owns.</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.65,
              color: "#6E6E78",
              maxWidth: 440,
              marginBottom: 36,
            }}
          >
            A focused Kanban board that lives in your Supabase. No subscriptions,
            no vendors, no data leaving your control. Just your team and their work.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#E14B3B",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 15,
                padding: "13px 28px",
                borderRadius: 12,
                letterSpacing: "-0.01em",
              }}
            >
              Start for free
              <ArrowRight />
            </Link>
            <a
              href="https://github.com/aaali/tack"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#6E6E78",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 14,
                padding: "13px 20px",
                borderRadius: 12,
                border: "1px solid #E6E5E1",
                background: "#fff",
              }}
            >
              <GithubIcon />
              View on GitHub
            </a>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 32,
              paddingTop: 32,
              borderTop: "1px solid #E6E5E1",
            }}
          >
            {[
              ["Magic-link login", "No passwords"],
              ["Real-time", "Every teammate"],
              ["RLS secure", "Row-level security"],
            ].map(([label, sub]) => (
              <div key={label}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1B1B1F" }}>{label}</p>
                <p style={{ fontSize: 11, color: "#6E6E78", marginTop: 1 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Board mockup */}
        <div className="fade-up fade-up-delay-2" style={{ position: "relative" }}>
          <BoardMockup />
        </div>
      </section>

      {/* Social proof / stats strip */}
      <div style={{ borderTop: "1px solid #E6E5E1", borderBottom: "1px solid #E6E5E1", background: "#fff" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {[
            ["Deploy in 5 min", "One command to Cloudflare"],
            ["Zero cost", "Free tier covers most teams"],
            ["100% open source", "MIT licensed, fork it"],
          ].map(([stat, sub]) => (
            <div key={stat} style={{ textAlign: "center" }}>
              <p
                className="font-display"
                style={{ fontSize: 18, fontWeight: 700, color: "#1B1B1F", letterSpacing: "-0.02em" }}
              >
                {stat}
              </p>
              <p style={{ fontSize: 12, color: "#6E6E78", marginTop: 2 }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2
            className="font-display fade-up"
            style={{
              fontSize: "clamp(28px, 3.5vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#1B1B1F",
              marginBottom: 12,
            }}
          >
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p style={{ fontSize: 16, color: "#6E6E78", maxWidth: 480, margin: "0 auto" }}>
            Tack is deliberately small. Every feature earns its place by making
            the team ship faster, not by filling a changelog.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="fade-up"
              style={{
                animationDelay: `${i * 0.08}s`,
                background: "#fff",
                border: "1px solid #E6E5E1",
                borderRadius: 16,
                padding: "28px 28px 24px",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#F6F5F2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  fontSize: 20,
                }}
              >
                {f.icon}
              </div>
              <h3
                className="font-display"
                style={{ fontSize: 17, fontWeight: 600, color: "#1B1B1F", marginBottom: 8, letterSpacing: "-0.01em" }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#6E6E78" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#fff", borderTop: "1px solid #E6E5E1", borderBottom: "1px solid #E6E5E1" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(28px, 3.5vw, 40px)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "#1B1B1F",
                marginBottom: 12,
              }}
            >
              Up and running in minutes
            </h2>
            <p style={{ fontSize: 16, color: "#6E6E78" }}>
              No Kubernetes, no ops team, no credit card required.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 32,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {steps.map((s, i) => (
              <div key={s.title} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: i === 0 ? "#E14B3B" : "#F6F5F2",
                    color: i === 0 ? "#fff" : "#6E6E78",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontWeight: 700,
                    fontSize: 16,
                    border: i !== 0 ? "1px solid #E6E5E1" : "none",
                  }}
                >
                  {i + 1}
                </div>
                <h3
                  className="font-display"
                  style={{ fontSize: 16, fontWeight: 600, color: "#1B1B1F", marginBottom: 8 }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: "#6E6E78", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <div
          style={{
            background: "#1B1B1F",
            borderRadius: 24,
            padding: "72px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* decorative pin dots */}
          <span
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#E14B3B",
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
              background: "#E14B3B",
              opacity: 0.5,
            }}
          />
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(30px, 4vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#F6F5F2",
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Your board. Your data.
            <br />
            <span style={{ color: "#E14B3B" }}>No asterisks.</span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "#9e9ea8",
              maxWidth: 440,
              margin: "0 auto 40px",
              lineHeight: 1.65,
            }}
          >
            Join teams who decided that their project management tool
            shouldn&apos;t cost a monthly subscription or their privacy.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#E14B3B",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 16,
              padding: "14px 32px",
              borderRadius: 12,
              letterSpacing: "-0.01em",
            }}
          >
            Get started — it&apos;s free
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #E6E5E1",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <TackMark size={20} withWordmark />
          <p style={{ fontSize: 13, color: "#6E6E78" }}>
            Open source under the MIT License.{" "}
            <a
              href="https://github.com/aaali/tack"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6E6E78", textDecoration: "underline" }}
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 760px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ---- Static data ----

const features = [
  {
    icon: "📌",
    title: "One board per team",
    desc: "No nested projects, no permission matrices. A board is a team. Move cards, not org charts.",
  },
  {
    icon: "⚡",
    title: "Real-time, always",
    desc: "Supabase Realtime means your team sees the same board simultaneously — no refresh button.",
  },
  {
    icon: "🔒",
    title: "Row-level security",
    desc: "Every query goes through Postgres RLS. Non-members literally can't see your data.",
  },
  {
    icon: "🔗",
    title: "Magic-link login",
    desc: "No passwords to reset, no SSO to configure. Just an email and a link.",
  },
  {
    icon: "⌘",
    title: "Keyboard-first",
    desc: "⌘K finds any card. C creates one. / searches. A power user never touches the mouse.",
  },
  {
    icon: "🚀",
    title: "Deploy in minutes",
    desc: "One Supabase project, one Cloudflare Worker. The README gets you there in under five minutes.",
  },
];

const steps = [
  {
    title: "Create a Supabase project",
    desc: "Free tier, takes 90 seconds. Run the schema from the repo.",
  },
  {
    title: "Deploy to Cloudflare",
    desc: "One command. Workers are free and global. No servers to manage.",
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

// ---- Inline SVG icons ----

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #E6E5E1",
        boxShadow: "0 24px 64px rgba(27,27,31,0.12), 0 4px 16px rgba(27,27,31,0.06)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Mockup top bar */}
      <div
        style={{
          height: 44,
          borderBottom: "1px solid #E6E5E1",
          background: "#fff",
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
            background: "#F6F5F2",
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
          background: "#F6F5F2",
          overflowX: "hidden",
        }}
      >
        {cols.map((col) => (
          <div
            key={col.title}
            style={{
              flex: 1,
              minWidth: 0,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #E6E5E1",
              padding: 10,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6E6E78",
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
                    background: "#F6F5F2",
                    borderRadius: 8,
                    padding: "8px 9px",
                    border: "1px solid #E6E5E1",
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
                        color: "#9e9ea8",
                        fontFamily: "var(--font-space-mono), monospace",
                      }}
                    >
                      {card.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "#1B1B1F", lineHeight: 1.4, fontWeight: 500 }}>
                    {card.title}
                  </p>
                  <div
                    style={{
                      marginTop: 6,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#E14B3B",
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
