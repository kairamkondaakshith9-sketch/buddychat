import { useState, useEffect } from 'react'
import {
  collection, getDocs, addDoc, serverTimestamp,
  where, doc, getDoc, query, onSnapshot, updateDoc, deleteDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import Avatar from './Avatar'
import styles from './Modal.module.css'

export default function NewChatModal({ currentUser, onClose, onChatCreated }) {
  const [tab, setTab] = useState('search')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState([])
  const [sent, setSent] = useState([])
  const [friends, setFriends] = useState([])

  useEffect(() => {
    const q1 = query(collection(db, 'friendRequests'),
      where('to', '==', currentUser.uid), where('status', '==', 'pending'))
    const unsub1 = onSnapshot(q1, snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))))

    const q2 = query(collection(db, 'friendRequests'),
      where('from', '==', currentUser.uid))
    const unsub2 = onSnapshot(q2, snap => setSent(snap.docs.map(d => ({ id: d.id, ...d.data() }))))

    const q3 = query(collection(db, 'friendRequests'),
      where('status', '==', 'accepted'), where('from', '==', currentUser.uid))
    const q4 = query(collection(db, 'friendRequests'),
      where('status', '==', 'accepted'), where('to', '==', currentUser.uid))
    const unsub3 = onSnapshot(q3, snap => {
      setFriends(prev => [...new Set([...snap.docs.map(d => d.data().to), ...prev.filter(f => !snap.docs.find(d => d.data().to === f))])])
    })
    const unsub4 = onSnapshot(q4, snap => {
      setFriends(prev => [...new Set([...prev, ...snap.docs.map(d => d.data().from)])])
    })

    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [currentUser.uid])

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return }
    const timeout = setTimeout(async () => {
      setLoading(true)
      const snap = await getDocs(collection(db, 'users'))
      const results = snap.docs.map(d => d.data()).filter(u =>
        u.uid !== currentUser.uid &&
        (u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
         u.email?.toLowerCase().includes(search.toLowerCase()))
      )
      setUsers(results)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  function getRequestStatus(uid) {
    const s = sent.find(r => r.to === uid)
    if (s) return s.status === 'accepted' ? 'friend' : 'sent'
    if (friends.includes(uid)) return 'friend'
    const incoming = requests.find(r => r.from === uid)
    if (incoming) return 'incoming'
    return 'none'
  }

  async function sendRequest(toUser) {
    await addDoc(collection(db, 'friendRequests'), {
      from: currentUser.uid,
      fromName: currentUser.displayName,
      fromPhoto: currentUser.photoURL || null,
      to: toUser.uid,
      toName: toUser.displayName,
      toPhoto: toUser.photoURL || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  }

  async function acceptRequest(req) {
    await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' })

    // Get latest user profiles for photos
    const fromUserDoc = await getDoc(doc(db, 'users', req.from))
    const toUserDoc = await getDoc(doc(db, 'users', currentUser.uid))
    const fromData = fromUserDoc.data()
    const toData = toUserDoc.data()

    const chatRef = await addDoc(collection(db, 'chats'), {
      isGroup: false,
      members: [currentUser.uid, req.from],
      memberNames: {
        [currentUser.uid]: currentUser.displayName,
        [req.from]: req.fromName,
      },
      memberPhotos: {
        [currentUser.uid]: toData?.photoURL || null,
        [req.from]: fromData?.photoURL || null,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
    })
    const chatDoc = await getDoc(chatRef)
    onChatCreated({ id: chatRef.id, ...chatDoc.data() })
  }

  async function declineRequest(req) {
    await deleteDoc(doc(db, 'friendRequests', req.id))
  }

  async function openChat(friendUid) {
    const q = query(collection(db, 'chats'), where('members', 'array-contains', currentUser.uid))
    const snap = await getDocs(q)
    const existing = snap.docs.find(d => {
      const data = d.data()
      return !data.isGroup && data.members.includes(friendUid)
    })
    if (existing) {
      // Update photos in existing chat
      const friendDoc = await getDoc(doc(db, 'users', friendUid))
      const meDoc = await getDoc(doc(db, 'users', currentUser.uid))
      await updateDoc(doc(db, 'chats', existing.id), {
        memberPhotos: {
          [currentUser.uid]: meDoc.data()?.photoURL || null,
          [friendUid]: friendDoc.data()?.photoURL || null,
        }
      })
      onChatCreated({ id: existing.id, ...existing.data() })
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Messages</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabRow}>
          <button className={`${styles.tabBtn} ${tab === 'search' ? styles.tabActive : ''}`} onClick={() => setTab('search')}>
            Find People
          </button>
          <button className={`${styles.tabBtn} ${tab === 'requests' ? styles.tabActive : ''}`} onClick={() => setTab('requests')}>
            Requests {requests.length > 0 && <span className={styles.tabBadge}>{requests.length}</span>}
          </button>
        </div>

        <div className={styles.modalBody}>
          {tab === 'search' && (
            <>
              <input className={styles.searchInput} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              {loading && <p className={styles.hint}>Searching…</p>}
              {!loading && search && users.length === 0 && <p className={styles.hint}>No users found.</p>}
              <div className={styles.userList}>
                {users.map(u => {
                  const status = getRequestStatus(u.uid)
                  return (
                    <div key={u.uid} className={styles.userItem}>
                      <Avatar name={u.displayName} photoURL={u.photoURL} size={38} />
                      <div style={{ flex: 1 }}>
                        <div className={styles.uname}>{u.displayName}</div>
                        <div className={styles.uemail}>{u.email}</div>
                      </div>
                      {status === 'none' && <button className={styles.actionBtn} onClick={() => sendRequest(u)}>Add friend</button>}
                      {status === 'sent' && <span className={styles.statusTag}>Sent</span>}
                      {status === 'incoming' && <button className={styles.actionBtn} onClick={() => acceptRequest(requests.find(r => r.from === u.uid))}>Accept</button>}
                      {status === 'friend' && <button className={styles.actionBtnGreen} onClick={() => openChat(u.uid)}>Message</button>}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'requests' && (
            <div className={styles.userList}>
              {requests.length === 0 && <p className={styles.hint}>No pending requests.</p>}
              {requests.map(req => (
                <div key={req.id} className={styles.userItem}>
                  <Avatar name={req.fromName} photoURL={req.fromPhoto} size={38} />
                  <div style={{ flex: 1 }}>
                    <div className={styles.uname}>{req.fromName}</div>
                    <div className={styles.uemail}>wants to message you</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.actionBtnGreen} onClick={() => acceptRequest(req)}>✓ Accept</button>
                    <button className={styles.actionBtnRed} onClick={() => declineRequest(req)}>✗</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
