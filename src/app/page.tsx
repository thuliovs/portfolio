import Link from "next/link";
import { HeroAsciiEngine } from "@/components/hero-ascii-engine";
import { ArrowIcon } from "@/components/icons";
import { ProjectCard } from "@/components/project-card";
import { ProfileLinks } from "@/components/profile-links";

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero-section" aria-labelledby="intro-heading">
        <div className="content-frame hero">
          <div className="hero-copy">
            {/*
            <p className="eyebrow">
              Product Engineer · Full-Stack &amp; Applied AI
            </p>
            */}
            <div className="hero-heading-stage">
              <HeroAsciiEngine />
              <h1 id="intro-heading">
                Human intent.
                <span>
                  Machine
                  <br />
                  precision.
                </span>
              </h1>
            </div>
            <div className="hero-supporting">
              <p className="hero-summary">
                I&apos;m Thúlio Silva, a Product Engineer building thoughtful
                software for people. My work brings together software
                architecture, product development, and applied AI.
              </p>
              <ProfileLinks />
            </div>
          </div>

          {/*
            Temporarily hidden while the hero layout is being refined.
            <ul className="hero-disciplines" aria-label="Areas of expertise">
              <li>
                <span>Focus</span>
                Full-stack &amp; Applied AI
              </li>
              <li>
                <span>Frontend</span>
                Next.js · React · TypeScript
              </li>
              <li>
                <span>Backend</span>
                Node.js · PostgreSQL
              </li>
            </ul>
          */}
        </div>
      </section>

      <section
        className="section-block"
        id="work"
        aria-labelledby="work-heading"
      >
        <div className="content-frame section-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Evidence over claims</p>
              <h2 id="work-heading">Selected work</h2>
            </div>
            <p>
              A small collection of product engineering work, documented with
              attention to context, constraints, and technical decisions.
            </p>
          </div>

          <div className="project-list">
            <ProjectCard
              index="01"
              title="M3 Nexus"
              description="A provisional case study about product engineering work completed at Emetrês. Public details are intentionally limited pending confidentiality review."
              tags={["Product engineering", "Full-stack", "Proprietary"]}
              href="/projects/m3-nexus"
            />

            <div className="coming-soon-card">
              <div>
                <span className="project-number">02</span>
                <h3>More projects</h3>
              </div>
              <span className="status-pill">Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section-block about-section"
        id="about"
        aria-labelledby="about-heading"
      >
        <div className="content-frame section-content about-grid">
          <div>
            <p className="eyebrow">How I work</p>
            <h2 id="about-heading">
              Product thinking,
              <br />
              engineering depth.
            </h2>
          </div>
          <div className="about-copy">
            <p>
              I start by understanding the business problem, the people
              involved, and the constraints around it. That context guides what
              should be built—and what should not.
            </p>
            <p>
              From there, I evaluate architectural trade-offs and develop
              software end to end, from interfaces and integrations to backend
              services and data. I prioritize readable systems that remain
              maintainable as products evolve.
            </p>
            <p>
              I use AI tools pragmatically to accelerate exploration and
              delivery, while keeping technical review, validation, and
              responsibility with the engineer.
            </p>
            <Link href="#contact" className="text-link">
              Start a conversation
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="contact-section"
        id="contact"
        aria-labelledby="contact-heading"
      >
        <div className="contact-inner">
          <p className="eyebrow">Contact</p>
          <h2 id="contact-heading">Let&apos;s build something considered.</h2>
          <p>
            For professional opportunities or product engineering
            conversations, reach me by email or through my public profiles.
          </p>
          <ProfileLinks compact />
        </div>
      </section>
    </main>
  );
}
