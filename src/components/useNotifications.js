import { useEffect, useRef } from 'react'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function useNotifications(currentUser, chats) {
  const prevUnreadRef = useRef({})
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !chats.length) return

    // On first load, just record current unread counts without notifying
    if (!initializedRef.current) {
      chats.forEach(chat => {
        prevUnreadRef.current[chat.id] = chat.unread?.[currentUser.uid] || 0
      })
      initializedRef.current = true
      return
    }

    if (Notification.permission !== 'granted') return

    chats.forEach(chat => {
      const currentUnread = chat.unread?.[currentUser.uid] || 0
      const prevUnread = prevUnreadRef.current[chat.id] ?? 0

      if (currentUnread > prevUnread) {
        const chatName = chat.isGroup
          ? chat.groupName
          : Object.entries(chat.memberNames || {})
              .find(([id]) => id !== currentUser.uid)?.[1] || 'Someone'

        // Show notification regardless of tab visibility
        try {
          const notif = new Notification(`💬 ${chatName}`, {
            body: chat.lastMessage || 'Sent you a message',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: chat.id,
            renotify: true,
            requireInteraction: false,
          })
          // Click notification to focus app
          notif.onclick = () => {
            window.focus()
            notif.close()
          }
        } catch(e) {
          console.log('Notification error:', e)
        }
      }
      prevUnreadRef.current[chat.id] = currentUnread
    })
  }, [chats, currentUser])
}
