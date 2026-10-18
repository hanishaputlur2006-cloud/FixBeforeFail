import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Gauge,
  HardHat,
  History,
  Layers,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
} from 'lucide-react'
import SiteHeader from '../../components/SiteHeader.jsx'
import SiteFooter from '../../components/SiteFooter.jsx'
import { StatusBadge } from '../../components/Badges.jsx'
import { STATUS_ORDER } from '../../lib/reportMeta.js'
import ProductPreview from './ProductPreview.jsx'
import './landing.css'

const STEPS = [
  {
    icon: Camera,
    title: 'Report',
    text: 'Citizens submit the problem with a photo, a location, a category and how serious it looks.',
  },
  {
    icon: Gauge,
    title: 'Score',
    text: 'Every report receives a transparent risk score from six weighted factors, with the reasons shown.',
  },
  {
    icon: Wrench,
    title: 'Resolve',
    text: 'Authorities verify, assign maintenance crews and track each repair through to closure.',
  },
]

// Default weights. These will live in a config file once the scoring engine is built.
const FACTORS = [
  { name: 'Severity', measures: 'How serious the reported damage is', weight: 25 },
  { name: 'Safety impact', measures: 'Risk of injury to people or vehicles', weight: 20 },
  { name: 'Public impact', measures: 'How many people depend on the asset', weight: 20 },
  { name: 'Repeat reports', measures: 'Independent reports of the same issue', weight: 15 },
  { name: 'Location importance', measures: 'Schools, hospitals, main roads', weight: 10 },
  { name: 'Time unresolved', measures: 'How long the issue has stayed open', weight: 10 },
]

const PRINCIPLES = [
  {
    icon: SlidersHorizontal,
    title: 'Configurable weights',
    text: 'Weights and priority thresholds are set in one place and can be tuned without code changes to the logic.',
  },
  {
    icon: Layers,
    title: 'Duplicates merged, not stacked',
    text: 'Repeat reports of one issue are grouped. Their contribution is capped so volume alone cannot inflate a score.',
  },
  {
    icon: ListChecks,
    title: 'Missing data handled carefully',
    text: 'Unknown factors use a neutral default and are flagged, never silently treated as zero or maximum.',
  },
  {
    icon: ShieldCheck,
    title: 'Rule-based, not a black box',
    text: 'Scores come from documented rules, not AI predictions, so every number can be checked and explained.',
  },
]

const ROLES = [
  {
    icon: Users,
    title: 'Citizens',
    points: ['Report issues with photo and location', 'Track the status of every report', 'Get updates as repairs progress'],
  },
  {
    icon: Building2,
    title: 'Authorities',
    points: ['See every issue ranked by risk', 'Verify reports and assign crews', 'Spot recurring and overdue problems'],
  },
  {
    icon: HardHat,
    title: 'Maintenance crews',
    points: ['View assigned work by priority', 'Update progress with remarks', 'Upload evidence when work is done'],
  },
]

const THRESHOLDS = [
  { level: 'Critical', range: '75 to 100', cls: 'critical' },
  { level: 'High', range: '50 to 74', cls: 'high' },
  { level: 'Medium', range: '25 to 49', cls: 'medium' },
  { level: 'Low', range: '0 to 24', cls: 'low' },
]

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-on-dark">Infrastructure early-warning platform</p>
              <h1>Report problems before they become failures.</h1>
              <p className="hero-lead">
                FixBeforeFail turns citizen reports into a ranked, explainable picture of public
                infrastructure risk, so the issues that matter most get fixed first.
              </p>
              <div className="hero-actions">
                <Link to="/report" className="btn btn-primary btn-lg">
                  Report an issue
                  <ArrowRight size={16} />
                </Link>
                <Link to="/register" className="btn btn-outline-light btn-lg">
                  Create an account
                </Link>
              </div>
              <ul className="hero-facts">
                <li>
                  <Gauge size={16} strokeWidth={1.75} /> Explainable risk scores
                </li>
                <li>
                  <History size={16} strokeWidth={1.75} /> Full status history
                </li>
                <li>
                  <ShieldCheck size={16} strokeWidth={1.75} /> Role-based access
                </li>
              </ul>
            </div>

            <ProductPreview />
          </div>
        </section>

        {/* How it works */}
        <section className="section" id="how-it-works">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">How it works</p>
              <h2>From a report to a repair, with nothing lost in between.</h2>
            </div>

            <ol className="steps">
              {STEPS.map((step, i) => (
                <li key={step.title} className="step card">
                  <div className="step-top">
                    <span className="icon-box">
                      <step.icon size={20} strokeWidth={1.75} />
                    </span>
                    <span className="step-num mono">0{i + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>

            <div className="lifecycle card">
              <div className="lifecycle-label">
                <h3>Every report follows an audited lifecycle</h3>
                <p>Each change is recorded with a timestamp, a remark and the person responsible.</p>
              </div>
              <ol className="lifecycle-steps">
                {STATUS_ORDER.map((status, i) => (
                  <li key={status}>
                    <StatusBadge status={status} />
                    {i < STATUS_ORDER.length - 1 && (
                      <ChevronRight size={14} className="lifecycle-sep" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Scoring */}
        <section className="section section-alt" id="scoring">
          <div className="container scoring">
            <div className="scoring-copy">
              <p className="eyebrow">Risk scoring</p>
              <h2>Every score shows its work.</h2>
              <p className="section-lead">
                Each report is scored from 0 to 100 using six factors. The score, the priority level and
                the factors behind it are visible to everyone who handles the report.
              </p>

              <ul className="principles">
                {PRINCIPLES.map((p) => (
                  <li key={p.title}>
                    <span className="icon-box icon-box-sm">
                      <p.icon size={16} strokeWidth={1.75} />
                    </span>
                    <div>
                      <h4>{p.title}</h4>
                      <p>{p.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card factors">
              <div className="factors-head">
                <h3>Scoring factors</h3>
                <span className="pq-sub mono">Default weights</span>
              </div>
              <table className="factors-table">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th className="factors-weight">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {FACTORS.map((f) => (
                    <tr key={f.name}>
                      <td>
                        <div className="factors-name">{f.name}</div>
                        <div className="factors-measures">{f.measures}</div>
                      </td>
                      <td className="factors-weight mono">{f.weight}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Maximum score</td>
                    <td className="factors-weight mono">100</td>
                  </tr>
                </tfoot>
              </table>

              <div className="thresholds">
                {THRESHOLDS.map((t) => (
                  <div key={t.level} className={`threshold threshold-${t.cls}`}>
                    <span className="threshold-level">{t.level}</span>
                    <span className="threshold-range mono">{t.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="section" id="roles">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Who it's for</p>
              <h2>One shared record for everyone involved.</h2>
            </div>

            <div className="roles">
              {ROLES.map((role) => (
                <div key={role.title} className="card role">
                  <span className="icon-box">
                    <role.icon size={20} strokeWidth={1.75} />
                  </span>
                  <h3>{role.title}</h3>
                  <ul>
                    {role.points.map((point) => (
                      <li key={point}>
                        <Check size={16} strokeWidth={2} className="role-check" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="cta">
          <div className="container cta-inner">
            <div>
              <h2>Seen something that needs fixing?</h2>
              <p>A short report today can prevent a failure tomorrow.</p>
            </div>
            <div className="cta-actions">
              <Link to="/report" className="btn btn-primary btn-lg">
                Report an issue
                <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn btn-outline-light btn-lg">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
