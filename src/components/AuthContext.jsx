import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userRef = doc(db, 'users', u.uid)
        const existing = await getDoc(userRef)
        await setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email.split('@')[0],
          photoURL: u.photoURL || null,
          lastSeen: serverTimestamp(),
          online: true,
          // Only set joinedAt on first time
          ...(existing.exists() ? {} : { joinedAt: serverTimestamp() }),
        }, { merge: true })
      }
      setUser(u)
    })
    return unsub
  }, [])

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
