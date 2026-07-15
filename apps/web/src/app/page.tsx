'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ============================================================
   SVG Icons (inline - no external dependencies)
   ============================================================ */

function IconLightning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11 5.17-.85 9-5.75 9-11V7l-9-5z" fill="currentColor" opacity="0.2" />
      <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11 5.17-.85 9-5.75 9-11V7l-9-5zm0 18.5c-3.75-.7-6.5-4.5-6.5-8.5V8.5L12 4.5l6.5 4V12c0 4-2.75 7.8-6.5 8.5z" fill="currentColor" />
      <path d="M10 15.5l-3.5-3.5 1.41-1.41L10 12.67l6.09-6.09 1.41 1.41L10 15.5z" fill="currentColor" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
    </svg>
  );
}

function IconCollaborate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor" />
    </svg>
  );
}

function IconChain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="currentColor" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" fill="currentColor" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3.06 16L7.4 14.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L10.94 18zM13 9V3.5L18.5 9H13z" fill="currentColor" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fill="currentColor" />
    </svg>
  );
}

/* ============================================================
   Logo Images
   ============================================================ */

const LOGOS = [
  {
    name: 'Stellar',
    src: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/stellar-logo-icon-svg-download-png-7002618.png?f=webp&w=128',
  },
  {
    name: 'Universitas Pattimura',
    src: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Logo_Universitas_Pattimura_Terbaru.png',
  },
  {
    name: 'Freighter Wallet',
    src: 'https://external-preview.redd.it/AiNxDMcGTq7dHjNRCHNAyEc_3tj3qRJgFxpDTw3l30c.jpg?auto=webp&s=29c13654a6925c7d979c1c39b20264e6883bd50c',
  },
  {
    name: 'Supabase',
    src: 'https://companieslogo.com/img/orig/supabase-554aca1c.png?t=1720244494',
  },
  {
    name: 'Next.js',
    src: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/next-js-logo-icon.png',
  },
  {
    name: 'Pinata',
    src: 'https://ecosystem.ipfs.tech/images/projects/icon-pinata.svg',
  },
  {
    name: 'IPFS',
    src: 'https://ipfs.tech/_nuxt/logo-ipfs.Crkf8JBP.png',
  },
  {
    name: 'TypeScript',
    src: 'https://cdn.iconscout.com/icon/free/png-256/free-typescript-icon-svg-download-png-2945272.png?f=webp&w=128',
  },
];

/* ============================================================
   Feature Data
   ============================================================ */

const FEATURES = [
  {
    icon: <IconLightning />,
    title: 'Instant Payments',
    desc: 'Readers pay directly to your Stellar wallet with zero-day settlement. Funds arrive in seconds - no platform holds, no withdrawal delays, no intermediaries.',
    highlight: '0% platform fee',
  },
  {
    icon: <IconShield />,
    title: 'Proof of Authorship',
    desc: 'Every work is minted as a unique Stellar asset. Publication date and authorship are recorded immutably on the blockchain for anyone to verify independently.',
    highlight: 'On-chain verified',
  },
  {
    icon: <IconCollaborate />,
    title: 'Collaborative Royalties',
    desc: 'Add co-authors, editors, and illustrators with automatic royalty splits via Soroban smart contracts. Revenue is distributed proportionally on every purchase.',
    highlight: 'Smart contract automated',
  },
  {
    icon: <IconWallet />,
    title: 'Freighter Wallet Auth',
    desc: 'Connect with Freighter wallet for full self-custody. No gas fees for readers - only minimal Stellar network fees. Secure, simple, and decentralized.',
    highlight: 'Self-custodial',
  },
  {
    icon: <IconChain />,
    title: 'License Management',
    desc: 'Issue exclusive or non-exclusive licenses for adaptations, translations, and republications. Smart contracts enforce resale royalties automatically.',
    highlight: '10% resale royalty',
  },
  {
    icon: <IconGlobe />,
    title: 'Cross-Currency Payments',
    desc: 'Readers pay with USDC, XLM, or other Stellar assets via the built-in DEX. Path payments convert to XLM at the best available rate automatically.',
    highlight: 'Stellar DEX integrated',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect & Create',
    desc: 'Install the Freighter browser extension. Use the rich text editor to write your work - supports headings, images, tables, and real-time collaboration.',
  },
  {
    step: '02',
    title: 'Publish & Mint',
    desc: 'Set your price, upload to IPFS, and mint your work as a unique Stellar asset. The blockchain timestamp proves your authorship forever.',
  },
  {
    step: '03',
    title: 'Earn & Track',
    desc: 'Readers pay directly to your wallet. Your dashboard shows revenue, royalties, license sales, and reader analytics. Withdraw anytime with zero platform fees.',
  },
];

const NAV_LINKS = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/upload', label: 'Publish' },
  { href: '/editor', label: 'Editor' },
  { href: '/dashboard', label: 'Dashboard' },
];

/* ============================================================
   LANDING PAGE
   ============================================================ */

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Inject marquee animation keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ============================================================ */}
      {/* TOP NAVIGATION */}
      {/* ============================================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-canvas/95 backdrop-blur-md border-b border-hairline shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-[1584px] flex items-center justify-between px-lg h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-headline font-semibold text-ink tracking-tight">Jingga</span>
          </Link>

          <div className="hidden md:flex items-center gap-lg">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-sm text-ink-muted hover:text-primary transition-colors relative after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-sm">
            <Link
              href="/login"
              className="text-body-sm text-ink-muted hover:text-primary transition-colors hidden sm:inline"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-primary text-on-primary text-button font-medium py-sm px-md hover:bg-primary-hover transition-all active:scale-[0.98]"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      </nav>

      <div className="h-16" />

      {/* ============================================================ */}
      {/* HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-canvas">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-[0.03]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[1584px] px-lg py-section">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 px-4 py-2 mb-xl">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-256-thumb/stellar-logo-icon-svg-download-png-7002618.png?f=webp&w=128"
                alt="Stellar"
                className="w-5 h-5 object-contain opacity-70"
              />
              <span className="text-body-sm text-ink-muted">
                Built on <span className="font-medium text-ink">Stellar Network</span>
              </span>
            </div>

            <h1 className="text-display-lg sm:text-display-xl text-ink mb-lg tracking-tight leading-[1.1]">
              Publish. License.{' '}
              <span className="bg-gradient-to-r from-primary to-blue-60 bg-clip-text text-transparent">
                Get Paid Instantly.
              </span>
            </h1>

            <p className="text-body-lg sm:text-subhead text-ink-muted mb-xl max-w-2xl leading-relaxed">
              A Web3 marketplace for independent writers and creators across Southeast Asia.
              Zero platform fees, instant settlements, transparent royalties -
              powered by the Stellar blockchain.
            </p>

            <div className="flex flex-wrap gap-md justify-center mb-xl">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-primary text-on-primary text-button font-medium py-sm px-lg hover:bg-primary-hover transition-all active:scale-[0.98]"
              >
                Explore Marketplace <ArrowRight />
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 border border-hairline-strong text-ink text-button py-sm px-lg hover:bg-surface-1 transition-colors"
              >
                Start Publishing
              </Link>
              <Link
                href="/editor"
                className="inline-flex items-center gap-2 border border-hairline text-ink-muted text-button py-sm px-lg hover:bg-surface-1 hover:text-ink transition-colors"
              >
                Try the Editor
              </Link>
            </div>

            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline overflow-hidden border border-hairline">
              {[
                { label: 'Platform Fee', value: '0%', sub: 'for creators' },
                { label: 'Settlement', value: '<5s', sub: 'on Stellar' },
                { label: 'Smart Contracts', value: '2', sub: 'deployed on testnet' },
                { label: 'Revenue Model', value: '100%', sub: 'to creators' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-1 py-lg px-md text-center group hover:bg-surface-2 transition-colors">
                  <div className="text-display-md text-primary font-light group-hover:scale-105 transition-transform duration-300">
                    {stat.value}
                  </div>
                  <div className="text-body-sm text-ink-muted mt-xs font-medium">{stat.label}</div>
                  <div className="text-caption text-ink-subtle mt-xxs">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MARQUEE LOGO BAR */}
      {/* ============================================================ */}
      <section className="bg-surface-1 border-y border-hairline py-lg overflow-hidden">
        <div className="mx-auto max-w-[1584px] px-lg">
          <p className="text-caption text-ink-subtle text-center uppercase tracking-widest mb-md">
            Supported by
          </p>
          <div className="overflow-hidden relative w-full">
            <div className="marquee-track flex items-center gap-xxl" style={{ width: 'fit-content' }}>
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <img
                  key={i}
                  src={logo.src}
                  alt={logo.name}
                  title={logo.name}
                  className="h-8 md:h-10 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES SECTION */}
      {/* ============================================================ */}
      <section className="bg-canvas py-section px-lg">
        <div className="mx-auto max-w-[1584px]">
          <div className="max-w-2xl mb-xxl">
            <span className="text-eyebrow text-primary font-medium uppercase tracking-wider">Platform Features</span>
            <h2 className="text-display-md text-ink mt-sm mb-md">
              Everything you need to publish, protect, and profit from your work.
            </h2>
            <p className="text-body-lg text-ink-muted">
              Jingga combines blockchain transparency with traditional publishing convenience.
              No crypto expertise required - just write, set your price, and earn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group bg-canvas border border-hairline p-xl hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 bg-primary/5 text-primary flex items-center justify-center mb-lg group-hover:bg-primary/10 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-card-title text-ink mb-sm">{feature.title}</h3>
                <p className="text-body text-ink-muted mb-md leading-relaxed">{feature.desc}</p>
                <span className="inline-flex items-center text-body-sm text-primary font-medium">
                  <IconCheck /> <span className="ml-xs">{feature.highlight}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* HOW IT WORKS */}
      {/* ============================================================ */}
      <section className="bg-surface-1 py-section px-lg">
        <div className="mx-auto max-w-[1584px]">
          <div className="text-center max-w-2xl mx-auto mb-xxl">
            <span className="text-eyebrow text-primary font-medium uppercase tracking-wider">Simple Workflow</span>
            <h2 className="text-display-md text-ink mt-sm mb-md">How It Works</h2>
            <p className="text-body-lg text-ink-muted">
              Three steps to start earning from your writing on the Stellar blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl relative">
            <div className="hidden md:block absolute top-16 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-0.5 bg-hairline -z-0" />

            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-16 h-16 bg-primary text-on-primary text-headline font-medium flex items-center justify-center mb-lg">
                  {item.step}
                </div>
                <h3 className="text-card-title text-ink mb-sm">{item.title}</h3>
                <p className="text-body text-ink-muted max-w-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-xxl">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary text-on-primary text-button font-medium py-sm px-lg hover:bg-primary-hover transition-all"
>
              Get Started Now <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* USE CASES */}
      {/* ============================================================ */}
      <section className="bg-canvas py-section px-lg">
        <div className="mx-auto max-w-[1584px]">
          <div className="text-center max-w-2xl mx-auto mb-xxl">
            <span className="text-eyebrow text-primary font-medium uppercase tracking-wider">Use Cases</span>
            <h2 className="text-display-md text-ink mt-sm mb-md">Who is Jingga for?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[
              {
                icon: <IconDocument />,
                title: 'Independent Writers',
                desc: 'Novelists, poets, journalists, and researchers who want to publish, protect their work, and earn directly from readers without intermediaries.',
              },
              {
                icon: <IconCollaborate />,
                title: 'Creative Teams',
                desc: 'Collaborative groups of writers, editors, illustrators, and translators who need transparent revenue sharing and automated royalty distribution.',
              },
              {
                icon: <IconGlobe />,
                title: 'Content Publishers',
                desc: 'Publishers and content platforms seeking a transparent licensing registry for adaptations, translations, and republications across Southeast Asia.',
              },
            ].map((useCase) => (
              <div key={useCase.title} className="bg-surface-1 border border-hairline p-xl text-center hover:border-primary/20 hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 bg-primary/5 text-primary flex items-center justify-center mx-auto mb-lg">
                  {useCase.icon}
                </div>
                <h3 className="text-card-title text-ink mb-sm">{useCase.title}</h3>
                <p className="text-body text-ink-muted">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FINAL CTA */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-primary py-section px-lg">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-xl" />
        </div>

        <div className="relative mx-auto max-w-[1584px] text-center">
          <h2 className="text-display-md text-on-primary mb-md">
            Ready to own your work?
          </h2>
          <p className="text-body-lg text-on-primary/80 mb-xl max-w-2xl mx-auto">
            Join independent creators across Southeast Asia. Publish your work, set your own price,
            and keep 100% of your revenue. No platform fees, ever.
          </p>
          <div className="flex flex-wrap gap-md justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-on-primary text-primary text-button font-semibold py-sm px-lg hover:opacity-90 transition-all active:scale-[0.98]"
>
              Connect Wallet <ArrowRight />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 border border-on-primary text-on-primary text-button py-sm px-lg hover:bg-on-primary hover:text-primary transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="bg-inverse-canvas border-t border-inverse-surface-1 py-xxl px-lg">
        <div className="mx-auto max-w-[1584px]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-xl mb-xxl">
            <div className="md:col-span-1">
              <h3 className="text-card-title text-inverse-ink mb-sm">Jingga</h3>
              <p className="text-body-sm text-inverse-ink-muted mb-lg max-w-xs">
                Publication and licensing platform for independent creators across Southeast Asia.
                Built on the Stellar network for the Stellar APAC Hackathon 2026.
              </p>
              <div className="flex items-center gap-md">
                <a href="https://github.com/indonesianviking/Jingga" target="_blank" rel="noopener noreferrer" className="text-inverse-ink-muted hover:text-inverse-ink transition-colors" aria-label="GitHub">
                  <IconGithub />
                </a>
                <a href="https://jingga-web-pi.vercel.app" target="_blank" rel="noopener noreferrer" className="text-inverse-ink-muted hover:text-inverse-ink transition-colors" aria-label="Website">
                  <IconGlobe />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-body-emphasis text-inverse-ink mb-md">Platform</h4>
              <ul className="space-y-sm">
                {['Marketplace', 'Upload', 'Editor', 'Dashboard'].map((link) => (
                  <li key={link}>
                    <Link href={`/${link.toLowerCase()}`} className="text-body-sm text-inverse-ink-muted hover:text-inverse-ink transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-body-emphasis text-inverse-ink mb-md">Resources</h4>
              <ul className="space-y-sm">
                {[
                  { label: 'Stellar Network', href: 'https://stellar.org' },
                  { label: 'Freighter Wallet', href: 'https://freighter.app' },
                  { label: 'Soroban Docs', href: 'https://soroban.stellar.org' },
                  { label: 'IPFS', href: 'https://ipfs.tech' },
                  { label: 'Supabase', href: 'https://supabase.com' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-body-sm text-inverse-ink-muted hover:text-inverse-ink transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-body-emphasis text-inverse-ink mb-md">About</h4>
              <ul className="space-y-sm">
                {[
                  { label: 'GitHub Repository', href: 'https://github.com/indonesianviking/Jingga' },
                  { label: 'MIT License', href: '#' },
                  { label: 'Universitas Patimura', href: 'https://unpatti.ac.id' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-body-sm text-inverse-ink-muted hover:text-inverse-ink transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-inverse-surface-1 pt-lg flex flex-col md:flex-row items-center justify-between gap-md">
            <p className="text-caption text-inverse-ink-muted">
              &copy; {new Date().getFullYear()} Jingga. Built for the Stellar APAC Hackathon 2026.
            </p>
            <div className="flex items-center gap-md text-caption text-inverse-ink-muted">
              <span>Powered by Stellar</span>
              <span className="hidden sm:inline">·</span>
              <span>MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
