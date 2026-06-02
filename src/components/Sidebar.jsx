import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import styles from './Sidebar.module.css'

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name, size = 40 }) {
  const colors = ['#7c6af7','#3dd68c','#f6ad55','#fc8181','#63b3ed','#f687b3','#68d391']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[idx] + '33',
      border: `2px solid ${colors[idx]}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, color: colors[idx], flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  )
}

export { Avatar, getInitials }

export default function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onNewGroup, onLogout, currentUser }) {
  const [search, setSearch] = useState('')
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'friendRequests'),
      where('to', '==', currentUser.uid),
      where('status', '==', 'pending'))
    const unsub = onSnapshot(q, snap => setPendingRequests(snap.size))
    return unsub
  }, [currentUser])

  const filtered = chats.filter(c => {
    const name = c.isGroup ? c.groupName : c.memberNames?.[currentUser?.uid === c.members?.[0] ? c.members?.[1] : c.members?.[0]]
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  function getChatName(chat) {
    if (chat.isGroup) return chat.groupName
    const otherId = chat.members.find(id => id !== currentUser?.uid)
    return chat.memberNames?.[otherId] || 'Unknown'
  }

  function getTime(ts) {
    if (!ts?.toDate) return ''
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: false }) } catch { return '' }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brand}>💬 BuddyChat</div>
          <button className={styles.logoutBtn} onClick={onLogout} title="Sign out">↩</button>
        </div>
        <div className={styles.user}>
          <Avatar name={currentUser?.displayName} size={32} />
          <span className={styles.userName}>{currentUser?.displayName}</span>
          <span className={styles.onlineDot} />
        </div>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.search}
          placeholder="🔍  Search chats…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.newBtns}>
        <button className={styles.newBtn} onClick={onNewChat}>
          ✉️ Message
          {pendingRequests > 0 && <span className={styles.reqBadge}>{pendingRequests}</span>}
        </button>
        <button className={styles.newBtn} onClick={onNewGroup}>👥 Group</button>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.empty}>No chats yet.<br />Add friends to start!</div>
        )}
        {filtered.map(chat => (
          <button
            key={chat.id}
            className={`${styles.chatItem} ${activeChat?.id === chat.id ? styles.active : ''}`}
            onClick={() => onSelectChat(chat)}
          >
            <Avatar name={getChatName(chat)} size={42} />
            <div className={styles.chatInfo}>
              <div className={styles.chatName}>{getChatName(chat)}</div>
              <div className={styles.chatPreview}>{chat.lastMessage || 'No messages yet'}</div>
            </div>
            <div className={styles.chatMeta}>
              <span className={styles.chatTime}>{getTime(chat.updatedAt)}</span>
              {chat.unread?.[currentUser?.uid] > 0 && (
                <span className={styles.badge}>{chat.unread[currentUser.uid]}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
