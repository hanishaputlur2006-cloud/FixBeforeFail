import './Logo.css'

// The FixBeforeFail mark: a shield (protection) holding a check whose
// right arm levels out into a flat beam (infrastructure kept steady).
// Set onDark when the logo sits on a navy background.
export default function Logo({ onDark = false, size = 28, wordmark = true }) {
  const shieldColor = onDark ? '#ffffff' : 'var(--navy-950)'
  const checkColor = onDark ? 'var(--teal-500)' : 'var(--teal-600)'

  return (
    <span className={`logo ${onDark ? 'logo-on-dark' : ''}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M16 2.5 27 6.6V15c0 6.9-4.6 11.9-11 14.5C9.6 26.9 5 21.9 5 15V6.6L16 2.5Z"
          stroke={shieldColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 16.2l4 4 5.6-5.6H23"
          stroke={checkColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {wordmark && (
        <span className="logo-word">
          <strong>Fix</strong>BeforeFail
        </span>
      )}
    </span>
  )
}
