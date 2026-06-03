import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import Avatar from './Avatar'
import { EditProfileModal } from './ProfileModal'
import { requestNotificationPermission } from './useNotifications'
import styles from './Sidebar.module.css'

export { default as AvatarComp } from './Avatar'

export default function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onNewGroup, onLogout, currentUser }) {
  const [search, setSearch] = useState('')
  const [pendingRequests, setPendingRequests] = useState(0)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'friendRequests'),
      where('to', '==', currentUser.uid),
      where('status', '==', 'pending'))
    const unsub = onSnapshot(q, snap => setPendingRequests(snap.size))
    return unsub
  }, [currentUser])

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission()
    setNotifPermission(granted ? 'granted' : 'denied')
    if (granted) {
      new Notification('🔔 BuddyChat notifications enabled!', {
        body: "You'll get notified when friends message you.",
        icon: '/icon-192.png',
      })
    }
  }

  const filtered = chats.filter(c => {
    const name = c.isGroup ? c.groupName : c.memberNames?.[currentUser?.uid === c.members?.[0] ? c.members?.[1] : c.members?.[0]]
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  function getChatName(chat) {
    if (chat.isGroup) return chat.groupName
    const otherId = chat.members.find(id => id !== currentUser?.uid)
    return chat.memberNames?.[otherId] || 'Unknown'
  }

  function getChatPhoto(chat) {
    if (chat.isGroup) return null
    const otherId = chat.members.find(id => id !== currentUser?.uid)
    return chat.memberPhotos?.[otherId] || null
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
        <div className={styles.user} onClick={() => setShowEditProfile(true)} title="Edit profile">
          <Avatar name={currentUser?.displayName} photoURL={currentUser?.photoURL} size={34} />
          <span className={styles.userName}>{currentUser?.displayName}</span>
          <span className={styles.editHint}>✏️</span>
          <span className={styles.onlineDot} />
        </div>
      </div>

      {notifPermission !== 'granted' && notifPermission !== 'denied' && (
        <button className={styles.notifBanner} onClick={handleEnableNotifications}>
          🔔 Enable notifications
        </button>
      )}
      {notifPermission === 'default' && (
        <button className={styles.notifBanner} onClick={handleEnableNotifications}>
          🔔 Tap to enable notifications
        </button>
      )}

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
            <Avatar name={getChatName(chat)} photoURL={getChatPhoto(chat)} size={42} />
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

      {showEditProfile && (
        <EditProfileModal
          currentUser={currentUser}
          onClose={(updated) => {
            setShowEditProfile(false)
            if (updated) forceUpdate(n => n + 1)
          }}
        />
      )}
    </aside>
  )
}
