import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import { useAuth } from '../components/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import NewChatModal from '../components/NewChatModal'
import NewGroupModal from '../components/NewGroupModal'
import styles from './ChatApp.module.css'

export default function ChatApp() {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.members?.includes(user.uid))
      setChats(all)
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    updateDoc(ref, { online: true, lastSeen: serverTimestamp() })
    const handleUnload = () => updateDoc(ref, { online: false, lastSeen: serverTimestamp() })
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [user])

  async function handleLogout() {
    await updateDoc(doc(db, 'users', user.uid), { online: false })
    await signOut(auth)
  }

  function handleSelectChat(chat) {
    setActiveChat(chat)
  }

  function handleBack() {
    setActiveChat(null)
  }

  const showSidebar = !isMobile || !activeChat
  const showMain = !isMobile || activeChat

  return (
    <div className={styles.app}>
      {showSidebar && (
        <Sidebar
          chats={chats}
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onLogout={handleLogout}
          currentUser={user}
          isMobile={isMobile}
        />
      )}

      {showMain && (
        <main className={isMobile && activeChat ? styles.mainVisible : styles.main}>
          {activeChat
            ? <ChatWindow chat={activeChat} currentUser={user} onBack={handleBack} />
            : <Welcome name={user?.displayName} onNewChat={() => setShowNewChat(true)} onNewGroup={() => setShowNewGroup(true)} />
          }
        </main>
      )}

      {showNewChat && (
        <NewChatModal
          currentUser={user}
          onClose={() => setShowNewChat(false)}
          onChatCreated={chat => { setActiveChat(chat); setShowNewChat(false) }}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          currentUser={user}
          onClose={() => setShowNewGroup(false)}
          onGroupCreated={chat => { setActiveChat(chat); setShowNewGroup(false) }}
        />
      )}
    </div>
  )
}

function Welcome({ name, onNewChat, onNewGroup }) {
  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeInner}>
        <div className={styles.welcomeIcon}>💬</div>
        <h2>Hey, {name}!</h2>
        <p>Select a chat or start a new one</p>
        <div className={styles.welcomeBtns}>
          <button onClick={onNewChat}>✉️ Message</button>
          <button onClick={onNewGroup}>👥 Group</button>
        </div>
      </div>
    </div>
  )
}
