import Link from 'next/link'

const sectionStyle: React.CSSProperties = { marginBottom: '1.75rem' }
const headingStyle: React.CSSProperties = { fontSize: '1.15rem', color: 'var(--gold)', marginBottom: '0.6rem' }
const pStyle: React.CSSProperties = { color: 'var(--cream-dim)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '0.75rem' }

export default function RulesPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.25rem' }}>Tournament Rules</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Everything your team needs to know for the round — keep this page handy</p>
      </div>

      <div className="card">
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Format &amp; Scoring</h2>
          <p style={pStyle}>
            Teams are made up of four players. On every hole, all four players tee off, and the team picks the
            best resulting shot. All four players then play their next shot from that spot — within one
            club-length, no closer to the hole, and in the same condition of lie (rough stays rough, bunker stays
            bunker). Repeat for every shot until the ball is holed. The team records <strong style={{ color: 'var(--cream)' }}>one score per hole</strong>.
          </p>
          <p style={pStyle}>
            Scoring is <strong style={{ color: 'var(--cream)' }}>net</strong> (handicap-adjusted). The team's
            handicap allowance is calculated as 20% of the lowest handicap on the team, plus 15% of the next,
            plus 10% of the next, plus 5% of the highest. Those four numbers are summed and rounded to the
            nearest whole stroke, then subtracted from the team's gross score to get the final net score.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Minimum Drives</h2>
          <p style={pStyle}>
            Every player's tee shot must be used at least once over the course of the round. This keeps the
            format fair — no team can win off a single long hitter's drive alone.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Team Specials</h2>
          <p style={pStyle}>
            Each team gets one of each of the following per round. Use them wisely.
          </p>
          <p style={pStyle}>
            <strong style={{ color: 'var(--cream)' }}>The Toss</strong> — once per round, a player may hand-throw
            the ball instead of hitting it. All four teammates must agree before it's used. It counts as one
            full stroke, same as a normal shot.
          </p>
          <p style={pStyle}>
            <strong style={{ color: 'var(--cream)' }}>The String</strong> — once per round, on any one green, the
            team may use a length of string to physically move the ball closer to the hole along the ground. The
            ball cannot be moved into the hole — it still has to be putted in from its new spot.
          </p>
          <p style={pStyle}>
            <strong style={{ color: 'var(--cream)' }}>The Regular Mulligan</strong> — each of the four players
            has one personal mulligan, but they can only be used together, all at once, on a single shot during
            the round (any shot, not just a tee shot). When the team calls it, all four players re-hit that same
            shot and the team plays the best result. This uses up everyone's mulligan at the same time — it
            can't be saved and used individually later.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Relief &amp; Lies</h2>
          <p style={pStyle}>
            <strong style={{ color: 'var(--cream)' }}>No gimmes</strong> — every putt must be holed out,
            regardless of distance.
          </p>
          <p style={pStyle}>
            <strong style={{ color: 'var(--cream)' }}>Out of bounds or a lost ball</strong> follows standard
            stroke-and-distance: replay from where the previous shot was hit, plus one penalty stroke.
          </p>
          <p style={pStyle}>
            <strong style={{ color: 'var(--cream)' }}>Unplayable lies and cart paths</strong> get standard free
            relief — nearest point of relief within one club-length, no closer to the hole.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Tiebreakers</h2>
          <p style={pStyle}>
            Ties are broken using net score, in this order: best score on the back 9 (holes 10–18), then back 6
            (holes 13–18), then back 3 (holes 16–18), then hole 18 alone. If still tied, a sudden-death playoff
            hole decides it.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Side Contest</h2>
          <p style={pStyle}>
            Closest to the Pin is open on any par-3 hole and tracked live in the{' '}
            <Link href="/portal/pin" style={{ color: 'var(--gold)' }}>Pin tab</Link>.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Pace of Play &amp; Etiquette</h2>
          <p style={pStyle}>
            Play ready golf — hit when you're ready rather than waiting on strict honors. Repair your divots and
            ball marks, rake bunkers after you're in them, and keep phones on silent.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>Scoring Submission</h2>
          <p style={pStyle}>
            Enter your team's one score per hole on the{' '}
            <Link href="/portal/scorecard" style={{ color: 'var(--gold)' }}>Scorecard tab</Link> as you play.
          </p>
        </div>
      </div>
    </div>
  )
}
