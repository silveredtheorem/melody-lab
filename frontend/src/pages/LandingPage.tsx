import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'
import './LandingPage.css'

// ─── Seeded RNG ───────────────────────────────────

function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return Math.abs(s) / 2147483648
  }
}

// ─── Logo ─────────────────────────────────────────

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="0"     y="8" width="3" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
      <rect x="4.25"  y="4" width="3" height="16" rx="1.5" fill="currentColor" fillOpacity="0.70" />
      <rect x="8.5"   y="0" width="3" height="20" rx="1.5" fill="currentColor" />
      <rect x="12.75" y="3" width="3" height="17" rx="1.5" fill="currentColor" fillOpacity="0.70" />
      <rect x="17"    y="8" width="3" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
    </svg>
  )
}

// ─── Icons ────────────────────────────────────────

function BranchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

function CommitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <line x1="12" y1="15" x2="12" y2="21" />
    </svg>
  )
}

function MergeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6"  cy="6"  r="3" />
      <circle cx="6"  cy="18" r="3" />
      <circle cx="18" cy="6"  r="3" />
      <path d="M6 9v5.5A2.5 2.5 0 0 0 8.5 17h7" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.09 6.42H21l-5.47 3.97 2.09 6.42L12 15.82l-5.62 4 2.09-6.42L3 9.42h6.91z" />
    </svg>
  )
}

// ─── Animated hero waveform ───────────────────────

const BAR_COUNT = 88

function HeroWaveform() {
  const rng = makeRng(0xf00dcafe)
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
    h:     12 + rng() * 88,
    delay: -(rng() * 2.8),
    dur:   0.7 + rng() * 1.4,
    i,
  }))

  return (
    <div className="hero-waveform" aria-hidden="true">
      {bars.map(b => (
        <span
          key={b.i}
          className="hero-waveform-bar"
          style={{
            '--bar-h':     `${b.h}%`,
            '--bar-delay': `${b.delay}s`,
            '--bar-dur':   `${b.dur}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ─── Feature cards ────────────────────────────────

const FEATURES = [
  {
    icon:  <BranchIcon />,
    title: 'branches',
    body:  'create a branch for every idea. experiment without touching your main timeline — merge the best takes when you\'re ready.',
  },
  {
    icon:  <CommitIcon />,
    title: 'commits',
    body:  'every save is a checkpoint. layer-level diffs show exactly what changed between sessions — nothing is ever lost.',
  },
  {
    icon:  <MergeIcon />,
    title: 'merge requests',
    body:  'propose changes, leave comments, and review diffs with your collaborators before bringing them into the main project.',
  },
  {
    icon:  <SparkleIcon />,
    title: 'ai generation',
    body:  'generate stems, loops, or chord ideas with AI. drop them straight into your session as a commit — no copy-paste required.',
  },
]

// ─── How-it-works steps ───────────────────────────

const STEPS = [
  {
    n:     '01',
    title: 'create a project',
    body:  'import your DAW session or start fresh. your project is the container for all your branches, commits, and history.',
  },
  {
    n:     '02',
    title: 'commit your changes',
    body:  'save any snapshot with a short message. every commit records a full diff of your layers — who changed what, and when.',
  },
  {
    n:     '03',
    title: 'branch and merge',
    body:  'spin up a branch to experiment freely. when an idea lands, open a merge request and bring it back to the main timeline.',
  },
]

// ─── Landing page ─────────────────────────────────

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="landing">

      {/* ── Nav ─────────────────────────────────── */}
      <header className="landing-nav">
        <Link to="/" className="landing-nav-logo">
          <span className="landing-nav-mark"><LogoMark size={20} /></span>
          <span className="landing-nav-wordmark">melody lab</span>
        </Link>
        <nav className="landing-nav-actions" aria-label="site navigation">
          <Link to="/auth" className="landing-nav-signin">sign in</Link>
          <Link to="/auth" className="landing-nav-cta">get started</Link>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-inner">
          <p className="hero-eyebrow">now in beta</p>
          <h1 id="hero-heading" className="hero-heading">
            version control<br />for music.
          </h1>
          <p className="hero-sub">
            commit your sessions. branch your ideas.<br className="hero-sub-br" />
            merge your best work.
          </p>
          <p className="hero-body">
            melody lab gives producers and bands the tools developers use to collaborate
            — rebuilt from the ground up for how music is actually made.
          </p>
          <div className="hero-actions">
            <Link to="/auth" className="hero-btn-primary">get started free</Link>
            <Link to="/auth" className="hero-btn-ghost">sign in →</Link>
          </div>
        </div>

        <HeroWaveform />
      </section>

      {/* ── Features ────────────────────────────── */}
      <section className="features" aria-labelledby="features-heading">
        <div className="features-inner">
          <h2 id="features-heading" className="section-heading">everything your project needs</h2>
          <p className="section-sub">
            from individual takes to full band collaboration — melody lab covers the whole workflow.
          </p>
          <div className="features-grid">
            {FEATURES.map(f => (
              <article key={f.title} className="feature-card">
                <span className="feature-card-icon">{f.icon}</span>
                <h3 className="feature-card-title">{f.title}</h3>
                <p className="feature-card-body">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────── */}
      <section className="how-it-works" aria-labelledby="hiw-heading">
        <div className="hiw-inner">
          <h2 id="hiw-heading" className="section-heading">how it works</h2>
          <p className="section-sub">three steps from first session to finished track.</p>
          <ol className="hiw-steps">
            {STEPS.map(s => (
              <li key={s.n} className="hiw-step">
                <span className="hiw-step-num">{s.n}</span>
                <h3 className="hiw-step-title">{s.title}</h3>
                <p className="hiw-step-body">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────── */}
      <section className="cta-strip" aria-labelledby="cta-heading">
        <div className="cta-strip-inner">
          <h2 id="cta-heading" className="cta-strip-heading">ready to commit?</h2>
          <p className="cta-strip-sub">
            join producers and bands already tracking their music with melody lab.
          </p>
          <Link to="/auth" className="hero-btn-primary">get started free</Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-mark"><LogoMark size={16} /></span>
            <span className="landing-footer-wordmark">melody lab</span>
          </div>
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} melody lab. all rights reserved.
          </p>
          <nav className="landing-footer-links" aria-label="footer navigation">
            <Link to="/auth" className="landing-footer-link">sign in</Link>
            <Link to="/auth" className="landing-footer-link">get started</Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}
