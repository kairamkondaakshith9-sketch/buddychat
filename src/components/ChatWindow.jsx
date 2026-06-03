import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, updateDoc, increment, writeBatch, getDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { format, isToday, isYesterday } from 'date-fns'
import Avatar from './Avatar'
import { UserProfileModal } from './ProfileModal'
import styles from './ChatWindow.module.css'

const EMOJIS = ['😀','😂','😍','🥰','😎','😢','😡','👍','👎','❤️','🔥','🎉','😅','🤔','😭','🙏','💪','✅','🎊','😊','👋','🤣','😏','😒','🥹','😤','🫡','🤩','😇','🥳']

function formatMsgTime(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a')
  return format(d, 'MMM d, h:mm a')
}

function formatLastSeen(ts, online) {
  if (online) return '🟢 Online'
  if (!ts?.toDate) return ''
  try {
    const d = ts.toDate()
    const diff = new Date() - d
    if (diff < 60000) return 'Last seen just now'
    if (diff < 3600000) return `Last seen ${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `Last seen today at ${format(d, 'h:mm a')}`
    return `Last seen ${format(d, 'MMM d')}`
  } catch { return '' }
}

function groupMessages(msgs) {
  const groups = []
  msgs.forEach((msg, i) => {
    const prev = msgs[i - 1]
    const sameAuthor = prev?.senderId === msg.senderId
    const ts = msg.createdAt?.toDate?.()
    const prevTs = prev?.createdAt?.toDate?.()
    const closeInTime = ts && prevTs && (ts - prevTs) < 5 * 60 * 1000
    if (sameAuthor && closeInTime) {
      groups[groups.length - 1].push(msg)
    } else {
      groups.push([msg])
    }
  })
  return groups
}

function ReadReceipt({ msg, currentUser, members }) {
  if (msg.senderId !== currentUser.uid) return null
  const otherMembers = members.filter(id => id !== currentUser.uid)
  const readBy = otherMembers.filter(id => msg.readBy?.[id])
  const allRead = readBy.length === otherMembers.length
  if (allRead) return <span className={styles.readTick} title="Read">✓✓</span>
  return <span className={styles.sentTick} title="Sent">✓✓</span>
}

export default function ChatWindow({ chat, currentUser, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [otherUserProfile, setOtherUserProfile] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const otherUserId = !chat.isGroup ? chat.members.find(id => id !== currentUser.uid) : null
  const chatName = chat.isGroup
    ? chat.groupName
    : chat.memberNames?.[otherUserId] || 'Chat'
  const chatPhoto = chat.isGroup ? null : chat.memberPhotos?.[otherUserId] || null

  // Load other user's live profile for last seen
  useEffect(() => {
    if (!otherUserId) return
    const unsub = onSnapshot(doc(db, 'users', otherUserId), d => {
      if (d.exists()) setOtherUserProfile(d.data())
    })
    return unsub
  }, [otherUserId])

  useEffect(() => {
    const q = query(collection(db, 'chats', chat.id, 'messages'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, async snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMessages(msgs)
      const batch = writeBatch(db)
      let hasUpdates = false
      snap.docs.forEach(d => {
        const msg = d.data()
        if (msg.senderId !== currentUser.uid && !msg.readBy?.[currentUser.uid]) {
          batch.update(d.ref, { [`readBy.${currentUser.uid}`]: true })
          hasUpdates = true
        }
      })
      if (hasUpdates) {
        await batch.commit()
        await updateDoc(doc(db, 'chats', chat.id), { [`unread.${currentUser.uid}`]: 0 })
      }
    })
    return unsub
  }, [chat.id, currentUser.uid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    setShowEmoji(false)
    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        text: trimmed,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        createdAt: serverTimestamp(),
        readBy: { [currentUser.uid]: true },
      })
      const unreadUpdate = {}
      chat.members.filter(id => id !== currentUser.uid).forEach(id => {
        unreadUpdate[`unread.${id}`] = increment(1)
      })
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed,
        lastSenderId: currentUser.uid,
        updatedAt: serverTimestamp(),
        ...unreadUpdate,
      })
    } catch (err) { console.error(err) }
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const grouped = groupMessages(messages)

  return (
    <div className={styles.window} onClick={() => setShowEmoji(false)}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>←</button>
        <div className={styles.headerClickable} onClick={() => !chat.isGroup && setShowProfile(true)}>
          <Avatar name={chatName} photoURL={chatPhoto} size={38} />
          <div className={styles.headerInfo}>
            <div className={styles.chatName}>{chatName}</div>
            <div className={styles.chatSub}>
              {chat.isGroup
                ? `${chat.members.length} members`
                : otherUserProfile
                  ? formatLastSeen(otherUserProfile.lastSeen, otherUserProfile.online)
                  : 'Direct message'
              }
            </div>
          </div>
        </div>
      </div>

      <div className={styles.messages}>
        {grouped.length === 0 && (
          <div className={styles.emptyMsg}><span>👋</span><p>Say hello to {chatName}!</p></div>
        )}
        {grouped.map((group, gi) => {
          const isMe = group[0].senderId === currentUser.uid
          return (
            <div key={gi} className={`${styles.group} ${isMe ? styles.mine : styles.theirs}`}>
              {!isMe && <Avatar name={group[0].senderName} size={30} />}
              <div className={styles.bubbles}>
                {!isMe && <div className={styles.senderName}>{group[0].senderName}</div>}
                {group.map((msg, mi) => (
                  <div key={msg.id} className={styles.bubbleRow}>
                    <div className={`${styles.bubble} ${isMe ? styles.bubbleMine : styles.bubbleTheirs}`}>
                      {msg.text}
                    </div>
                    {mi === group.length - 1 && (
                      <div className={`${styles.msgMeta} ${isMe ? styles.msgMetaMine : ''}`}>
                        <span className={styles.msgTime}>{formatMsgTime(msg.createdAt)}</span>
                        {isMe && <ReadReceipt msg={msg} currentUser={currentUser} members={chat.members} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isMe && <div style={{ width: 30, flexShrink: 0 }} />}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div className={styles.emojiPicker} onClick={e => e.stopPropagation()}>
          {EMOJIS.map(e => (
            <button key={e} className={styles.emojiBtn} onClick={() => { setText(p => p + e); inputRef.current?.focus() }}>{e}</button>
          ))}
        </div>
      )}

      <form className={styles.inputRow} onSubmit={sendMessage} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.emojiToggle} onClick={e => { e.stopPropagation(); setShowEmoji(v => !v) }}>😊</button>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button className={styles.sendBtn} type="submit" disabled={!text.trim() || sending}>➤</button>
      </form>

      {showProfile && otherUserId && (
        <UserProfileModal
          uid={otherUserId}
          currentUserId={currentUser.uid}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
