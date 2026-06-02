import { useState, useEffect } from 'react'
import { collection, query, getDocs, addDoc, serverTimestamp, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Avatar } from './Sidebar'
import styles from './Modal.module.css'

export default function NewChatModal({ currentUser, onClose, onChatCreated }) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return }
    const timeout = setTimeout(async () => {
      setLoading(true)
      const q = query(collection(db, 'users'))
      const snap = await getDocs(q)
      const results = snap.docs
        .map(d => d.data())
        .filter(u => u.uid !== currentUser.uid &&
          (u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
           u.email?.toLowerCase().includes(search.toLowerCase()))
        )
      setUsers(results)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  async function startChat(otherUser) {
    // Check if direct chat already exists
    const q = query(collection(db, 'chats'),
      where('isGroup', '==', false),
      where('members', 'array-contains', currentUser.uid)
    )
    const snap = await getDocs(q)
    const existing = snap.docs.find(d => {
      const data = d.data()
      return data.members.includes(otherUser.uid)
    })

    if (existing) {
      onChatCreated({ id: existing.id, ...existing.data() })
      return
    }

    const chatRef = await addDoc(collection(db, 'chats'), {
      isGroup: false,
      members: [currentUser.uid, otherUser.uid],
      memberNames: {
        [currentUser.uid]: currentUser.displayName,
        [otherUser.uid]: otherUser.displayName,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
    })
    const chatDoc = await getDoc(chatRef)
    onChatCreated({ id: chatRef.id, ...chatDoc.data() })
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>New message</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <input
            className={styles.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {loading && <p className={styles.hint}>Searching…</p>}
          {!loading && search && users.length === 0 && (
            <p className={styles.hint}>No users found. They need to sign up first.</p>
          )}
          <div className={styles.userList}>
            {users.map(u => (
              <button key={u.uid} className={styles.userItem} onClick={() => startChat(u)}>
                <Avatar name={u.displayName} size={38} />
                <div>
                  <div className={styles.uname}>{u.displayName}</div>
                  <div className={styles.uemail}>{u.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
