import { useEffect, useRef } from 'react'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function useNotifications(currentUser, chats) {
  const prevChats = useRef({})

  useEffect(() => {
    if (!currentUser) return
    // Request permission as soon as user is logged in
    requestNotificationPermission()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || !chats.length) return
    if (Notification.permission !== 'granted') return

    // Update counts when tab is visible
    if (document.visibilityState === 'visible') {
      chats.forEach(chat => {
        prevChats.current[chat.id] = chat.unread?.[currentUser.uid] || 0
      })
      return
    }

    chats.forEach(chat => {
      const currentUnread = chat.unread?.[currentUser.uid] || 0
      const prevUnread = prevChats.current[chat.id] ?? currentUnread

      if (currentUnread > prevUnread) {
        const chatName = chat.isGroup
          ? chat.groupName
          : Object.entries(chat.memberNames || {})
              .find(([id]) => id !== currentUser.uid)?.[1] || 'Someone'

        new Notification(`💬 ${chatName}`, {
          body: chat.lastMessage || 'Sent you a message',
          icon: '/icon-192.png',
          tag: chat.id,
        })
      }
      prevChats.current[chat.id] = currentUnread
    })
  }, [chats, currentUser])
}
