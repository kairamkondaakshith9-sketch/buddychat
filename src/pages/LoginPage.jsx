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
  const [mode, setMode] = useState('login')
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
        'auth/email-already-in-use': 'Email already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Wrong email or password.',
        'auth/invalid-credential': 'Wrong email or password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }
      setError(msgs[err.code] || err.message)
    }
    setLoading(false)
  }

  function switchMode(m) {
    setMode(m); setError(''); setResetSent(false)
    setEmail(''); setPassword(''); setName('')
  }

  if (mode === 'forgot') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>🔑</div>
          <h1 className={styles.title}>Reset Password</h1>
          {resetSent ? (
            <>
              <p className={styles.subtitle}>Reset email sent to <strong>{email}</strong> — check your inbox and spam folder!</p>
              <button className={styles.submit} onClick={() => switchMode('login')}>← Back to Sign in</button>
            </>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <p className={styles.subtitle}>Enter your email to receive a reset link</p>
              <div className={styles.field}>
                <label>Email</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? 'Sending…' : '📧 Send reset email'}
              </button>
              <button type="button" className={styles.forgotLink} onClick={() => switchMode('login')}>← Back to Sign in</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>💬</div>
        <h1 className={styles.title}>BuddyChat</h1>
        <p className={styles.subtitle}>Chat with your friends, anywhere</p>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`} onClick={() => switchMode('login')}>Sign in</button>
          <button className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`} onClick={() => switchMode('register')}>Register</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label>Name</label>
              <input type="text" placeholder="e.g. Arjun" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label>Password</label>
              {mode === 'login' && (
                <button type="button" className={styles.forgotInline} onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              )}
            </div>
            <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
