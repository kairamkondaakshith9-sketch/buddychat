import { useState, useEffect } from 'react'
import { collection, query, getDocs, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Avatar } from './Sidebar'
import styles from './Modal.module.css'

export default function NewGroupModal({ currentUser, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState('')
  const [search, setSearch] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadUsers() {
      const snap = await getDocs(collection(db, 'users'))
      setAllUsers(snap.docs.map(d => d.data()).filter(u => u.uid !== currentUser.uid))
    }
    loadUsers()
  }, [])

  const filtered = allUsers.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  function toggleUser(u) {
    setSelected(prev => prev.find(s => s.uid === u.uid)
      ? prev.filter(s => s.uid !== u.uid)
      : [...prev, u]
    )
  }

  async function createGroup() {
    if (!groupName.trim() || selected.length === 0) return
    setLoading(true)
    const members = [currentUser, ...selected]
    const memberNames = {}
    members.forEach(u => { memberNames[u.uid] = u.displayName })

    const chatRef = await addDoc(collection(db, 'chats'), {
      isGroup: true,
      groupName: groupName.trim(),
      members: members.map(u => u.uid),
      memberNames,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
    })
    const chatDoc = await getDoc(chatRef)
    onGroupCreated({ id: chatRef.id, ...chatDoc.data() })
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>New group chat</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <input
            className={styles.searchInput}
            placeholder="Group name…"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            autoFocus
          />

          {selected.length > 0 && (
            <div className={styles.chips}>
              {selected.map(u => (
                <span key={u.uid} className={styles.chip}>
                  {u.displayName}
                  <button onClick={() => toggleUser(u)}>✕</button>
                </span>
              ))}
            </div>
          )}

          <input
            className={styles.searchInput}
            placeholder="Search friends to add…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginTop: 8 }}
          />

          <div className={styles.userList}>
            {filtered.map(u => {
              const isSelected = selected.find(s => s.uid === u.uid)
              return (
                <button
                  key={u.uid}
                  className={`${styles.userItem} ${isSelected ? styles.selectedItem : ''}`}
                  onClick={() => toggleUser(u)}
                >
                  <Avatar name={u.displayName} size={36} />
                  <div style={{ flex: 1 }}>
                    <div className={styles.uname}>{u.displayName}</div>
                    <div className={styles.uemail}>{u.email}</div>
                  </div>
                  {isSelected && <span className={styles.checkmark}>✓</span>}
                </button>
              )
            })}
          </div>

          <button
            className={styles.createBtn}
            onClick={createGroup}
            disabled={!groupName.trim() || selected.length === 0 || loading}
          >
            {loading ? 'Creating…' : `Create group (${selected.length + 1} members)`}
          </button>
        </div>
      </div>
    </div>
  )
}
