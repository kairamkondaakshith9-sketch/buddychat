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
        try {
          const userRef = doc(db, 'users', u.uid)
          const existing = await getDoc(userRef)
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email.split('@')[0],
            photoURL: u.photoURL || null,
            lastSeen: serverTimestamp(),
            online: true,
            ...(existing.exists() ? {} : { joinedAt: serverTimestamp() }),
          }, { merge: true })
        } catch (err) {
          console.error('Firestore update failed:', err)
          // Still set user even if Firestore fails
        }
      }
      setUser(u)
    })
    return unsub
  }, [])

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
