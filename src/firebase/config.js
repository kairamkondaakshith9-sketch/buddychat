import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCkylTmlYZ_FWy13Nq8SjZWvNVM5SvIw1s",
  authDomain: "buddychat-9d353.firebaseapp.com",
  projectId: "buddychat-9d353",
  storageBucket: "buddychat-9d353.firebasestorage.app",
  messagingSenderId: "897525580035",
  appId: "1:897525580035:web:1d57b6982b07030618e936"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app