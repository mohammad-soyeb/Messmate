import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ShoppingBasket,
  Sparkles,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";

import "../styles/landing.css";

const features = [
  {
    icon: UtensilsCrossed,
    title: "Daily meal tracking",
    description:
      "Record breakfast, lunch and dinner for every member in a clear daily sheet.",
    tone: "blue",
  },
  {
    icon: ShoppingBasket,
    title: "Bazaar management",
    description:
      "Keep item-wise bazaar entries, receipts and member contributions together.",
    tone: "green",
  },
  {
    icon: UsersRound,
    title: "Member overview",
    description:
      "Manage member details and understand each person’s monthly activity quickly.",
    tone: "violet",
  },
  {
    icon: BarChart3,
    title: "Monthly reports",
    description:
      "See meal rate, meal cost, bazaar paid and member balances in one report.",
    tone: "amber",
  },
];

const Landing = () => {
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="landing-brand" href="#top" aria-label="MessMate home">
          <span className="landing-brand-mark">
            <UtensilsCrossed size={21} />
          </span>
          <span>MessMate</span>
        </a>

        <nav aria-label="Landing page navigation">
          <a href="#features">Features</a>
          <a href="#about">How it works</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="header-buttons">
          <Link to="/login" className="btn-outline">
            Log in
          </Link>
          <Link to="/register" className="btn-primary">
            Get started
            <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-left">
            <span className="hero-eyebrow">
              <Sparkles size={16} />
              A calmer way to run your mess
            </span>

            <h1>
              Every meal and bazaar record,
              <span> beautifully organized.</span>
            </h1>

            <p>
              MessMate brings daily meals, bazaar history, members and monthly
              reports into one simple workspace built for bachelor messes.
            </p>

            <div className="hero-buttons">
              <Link to="/register" className="btn-primary hero-primary">
                Create your mess
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-outline">
                Open dashboard
              </Link>
            </div>

            <div className="hero-trust">
              <span>
                <CheckCircle2 size={16} />
                Fast setup
              </span>
              <span>
                <CheckCircle2 size={16} />
                Easy monthly calculation
              </span>
            </div>
          </div>

          <div className="hero-right" aria-label="MessMate dashboard preview">
            <div className="hero-glow hero-glow-one" />
            <div className="hero-glow hero-glow-two" />

            <div className="hero-card">
              <div className="hero-card-header">
                <div>
                  <span>MONTHLY OVERVIEW</span>
                  <h2>July 2026</h2>
                </div>
                <div className="hero-status">
                  <span />
                  Live
                </div>
              </div>

              <div className="hero-highlight">
                <span>Current meal rate</span>
                <strong>৳ 102.40</strong>
                <small>Bazaar total ÷ meals</small>
              </div>

              <div className="hero-stats-grid">
                <div className="hero-stat">
                  <span>Total Meals</span>
                  <strong>245</strong>
                  <small>+18 this week</small>
                </div>
                <div className="hero-stat">
                  <span>Total Bazaar</span>
                  <strong>৳ 25,088</strong>
                  <small>12 entries</small>
                </div>
                <div className="hero-stat">
                  <span>Members</span>
                  <strong>8</strong>
                  <small>All active</small>
                </div>
                <div className="hero-stat">
                  <span>Today&apos;s Meals</span>
                  <strong>21</strong>
                  <small>Updated now</small>
                </div>
              </div>
            </div>

            <div className="floating-card floating-card-top">
              <ShoppingBasket size={18} />
              Bazaar added
            </div>
            <div className="floating-card floating-card-bottom">
              <CheckCircle2 size={18} />
              Report ready
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <span>EVERYTHING YOU NEED</span>
            <h2>Simple tools for smooth mess management</h2>
            <p>
              Clear records, fewer calculations and no confusion at month end.
            </p>
          </div>

          <div className="feature-grid">
            {features.map(({ icon: Icon, title, description, tone }) => (
              <article className="feature-card" key={title}>
                <div className={`feature-icon ${tone}`}>
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-about" id="about">
          <div>
            <span className="about-label">BUILT FOR REAL ROUTINES</span>
            <h2>From today&apos;s meal sheet to the final monthly balance.</h2>
          </div>

          <div className="about-steps">
            <article>
              <span>01</span>
              <div>
                <h3>Add your members</h3>
                <p>Create the mess and keep everyone&apos;s details together.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Record meals and bazaar</h3>
                <p>Update daily activity whenever it happens.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Review the report</h3>
                <p>Get the meal rate and member-wise balance automatically.</p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="contact">
        <div className="landing-brand footer-brand">
          <span className="landing-brand-mark">
            <UtensilsCrossed size={20} />
          </span>
          <span>MessMate</span>
        </div>
        <p>Made for simpler meals, clearer bazaar records and peaceful month ends.</p>
        <span>© {new Date().getFullYear()} MessMate</span>
      </footer>
    </div>
  );
};

export default Landing;
