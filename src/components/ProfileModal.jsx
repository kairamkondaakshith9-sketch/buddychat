import { useState, useRef } from 'react'
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import Avatar from './Avatar'
import { format } from 'date-fns'
import styles from './ProfileModal.module.css'

const CLOUDINARY_CLOUD = 'deuxgybso'
const CLOUDINARY_PRESET = 'buddychat_avatars'

function formatLastSeen(ts, online) {
  if (online) return 'Online'
  if (!ts?.toDate) return 'Unknown'
  try {
    const d = ts.toDate()
    const diff = new Date() - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)} min ago`
    if (diff < 86400000) return `Today at ${format(d, 'h:mm a')}`
    return format(d, 'MMM d, yyyy')
  } catch { return 'Unknown' }
}

export function UserProfileModal({ uid, onClose }) {
  const [profile, setProfile] = useState(null)

  useState(() => {
    getDoc(doc(db, 'users', uid)).then(d => {
      if (d.exists()) setProfile(d.data())
    })
  })

  if (!profile) return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal}><div className={styles.loading}>Loading…</div></div>
    </div>
  )

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        <div className={styles.profileTop}>
          <Avatar name={profile.displayName} photoURL={profile.photoURL} size={80} />
          <h2 className={styles.profileName}>{profile.displayName}</h2>
          <p className={styles.profileEmail}>{profile.email}</p>
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>🟢</span>
            <div>
              <div className={styles.infoLabel}>Last seen</div>
              <div className={styles.infoValue}>{formatLastSeen(profile.lastSeen, profile.online)}</div>
            </div>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>📅</span>
            <div>
              <div className={styles.infoLabel}>Joined</div>
              <div className={styles.infoValue}>
                {profile.joinedAt?.toDate ? format(profile.joinedAt.toDate(), 'MMMM d, yyyy') : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EditProfileModal({ currentUser, onClose }) {
  const [name, setName] = useState(currentUser.displayName || '')
  const [status, setStatus] = useState('')
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('')
  }

  async function uploadToCloudinary(file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)
    formData.append('folder', 'buddychat_avatars')

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Upload failed')
    }

    const data = await res.json()
    return data.secure_url
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setStatus('Saving…')

    try {
      let newPhotoURL = photoURL

      if (file) {
        setStatus('Uploading photo…')
        newPhotoURL = await uploadToCloudinary(file)
        setStatus('Photo uploaded! ✓')
      }

      setStatus('Saving profile…')

      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
        photoURL: newPhotoURL,
      })

      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: name.trim(),
        photoURL: newPhotoURL,
        lastSeen: serverTimestamp(),
      })

      setStatus('✅ Saved!')
      setTimeout(() => onClose(true), 800)
    } catch (err) {
      console.error(err)
      setStatus('❌ Error: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Edit Profile</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.editBody}>
          <div className={styles.avatarEdit} onClick={() => fileRef.current.click()}>
            <Avatar name={name} photoURL={preview || photoURL} size={80} />
            <div className={styles.avatarOverlay}>📷 Change</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {file && (
            <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>
              📎 {file.name} ({Math.round(file.size/1024)}KB) — ready to upload
            </div>
          )}

          <div className={styles.field}>
            <label>Display name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Email</label>
            <input value={currentUser.email} disabled className={`${styles.input} ${styles.disabled}`} />
          </div>

          {status && (
            <div style={{
              fontSize: 13,
              color: status.includes('❌') ? 'var(--red)' : status.includes('✅') ? 'var(--green)' : 'var(--text2)',
              textAlign: 'center',
              padding: '4px 0',
              fontWeight: 500
            }}>
              {status}
            </div>
          )}

          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Please wait…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
