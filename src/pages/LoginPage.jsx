import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '../firebase/config'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!name.trim()) { setError('Enter your name'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name.trim() })
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email)
        setResetSent(true)
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Email already registered. Try logging in.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Wrong email or password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/missing-email': 'Please enter your email address.',
      }
      setError(msgs[err.code] || err.message)
    }
    setLoading(false)
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setResetSent(false)
    setEmail('')
    setPassword('')
    setName('')
  }

  // ── Forgot password screen ──
  if (mode === 'forgot') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>🔑</div>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            {resetSent
              ? 'Check your email for the reset link!'
              : "Enter your email and we'll send you a reset link"}
          </p>

          {resetSent ? (
            <div className={styles.successBox}>
              <div className={styles.successIcon}>📧</div>
              <p>A password reset email has been sent to <strong>{email}</strong></p>
              <p className={styles.successHint}>
                Check your inbox (and spam folder). Click the link in the email to set a new password. Then come back and sign in!
              </p>
              <button className={styles.submit} onClick={() => switchMode('login')} style={{ marginTop: 16 }}>
                Back to Sign in
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? 'Sending…' : '📧 Send reset email'}
              </button>

              <button
                type="button"
                className={styles.backLink}
                onClick={() => switchMode('login')}
              >
                ← Back to Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Login / Register screen ──
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>💬</div>
        <h1 className={styles.title}>BuddyChat</h1>
        <p className={styles.subtitle}>Chat with your friends, anywhere</p>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`} onClick={() => switchMode('login')}>Sign in</button>
          <button className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`} onClick={() => switchMode('register')}>Create account</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label>Your name</label>
              <input type="text" placeholder="e.g. Arjun" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => switchMode('forgot')}
            >
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
