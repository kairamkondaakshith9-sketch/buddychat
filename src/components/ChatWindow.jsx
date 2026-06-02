import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, updateDoc, increment
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { Avatar } from './Sidebar'
import styles from './ChatWindow.module.css'

function formatMsgTime(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a')
  return format(d, 'MMM d, h:mm a')
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

export default function ChatWindow({ chat, currentUser, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const chatName = chat.isGroup
    ? chat.groupName
    : chat.memberNames?.[chat.members.find(id => id !== currentUser.uid)] || 'Chat'

  useEffect(() => {
    const q = query(collection(db, 'chats', chat.id, 'messages'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [chat.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        text: trimmed,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        createdAt: serverTimestamp(),
      })
      // Update chat metadata
      const chatRef = doc(db, 'chats', chat.id)
      const unreadUpdate = {}
      chat.members.filter(id => id !== currentUser.uid).forEach(id => {
        unreadUpdate[`unread.${id}`] = increment(1)
      })
      await updateDoc(chatRef, {
        lastMessage: trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed,
        lastSenderId: currentUser.uid,
        updatedAt: serverTimestamp(),
        ...unreadUpdate,
      })
    } catch (err) {
      console.error(err)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const grouped = groupMessages(messages)

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>←</button>
        <Avatar name={chatName} size={38} />
        <div className={styles.headerInfo}>
          <div className={styles.chatName}>{chatName}</div>
          <div className={styles.chatSub}>
            {chat.isGroup ? `${chat.members.length} members` : 'Direct message'}
          </div>
        </div>
      </div>

      <div className={styles.messages}>
        {grouped.length === 0 && (
          <div className={styles.emptyMsg}>
            <span>👋</span>
            <p>Say hello to {chatName}!</p>
          </div>
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
                      <span className={styles.msgTime}>{formatMsgTime(msg.createdAt)}</span>
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

      <form className={styles.inputRow} onSubmit={sendMessage}>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button className={styles.sendBtn} type="submit" disabled={!text.trim() || sending}>
          ➤
        </button>
      </form>
    </div>
  )
}
