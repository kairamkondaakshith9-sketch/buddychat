import { useState, useRef } from 'react'
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '../firebase/config'
import Avatar from './Avatar'
import { format } from 'date-fns'
import styles from './ProfileModal.module.css'

function formatLastSeen(ts, online) {
  if (online) return 'Online'
  if (!ts?.toDate) return 'Unknown'
  try {
    const d = ts.toDate()
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)} min ago`
    if (diff < 86400000) return `Today at ${format(d, 'h:mm a')}`
    if (diff < 172800000) return `Yesterday at ${format(d, 'h:mm a')}`
    return format(d, 'MMM d, yyyy')
  } catch { return 'Unknown' }
}

// View another user's profile
export function UserProfileModal({ uid, currentUserId, onClose }) {
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

// Edit own profile
export function EditProfileModal({ currentUser, onClose }) {
  const [name, setName] = useState(currentUser.displayName || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const fileRef = useRef()

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    setSaving(true)
    try {
      let newPhotoURL = photoURL

      // Upload photo if selected
      if (file) {
        setUploading(true)
        const storageRef = ref(storage, `avatars/${currentUser.uid}`)
        await uploadBytes(storageRef, file)
        newPhotoURL = await getDownloadURL(storageRef)
        setUploading(false)
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
        photoURL: newPhotoURL,
      })

      // Update Firestore user doc
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: name.trim(),
        photoURL: newPhotoURL,
        lastSeen: serverTimestamp(),
      })

      onClose(true) // true = updated
    } catch (err) {
      console.error(err)
      alert('Error saving: ' + err.message)
    }
    setSaving(false)
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

          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {uploading ? 'Uploading photo…' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
