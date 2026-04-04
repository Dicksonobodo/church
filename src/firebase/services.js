import { db } from "./config"
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, limit
} from "firebase/firestore"

const COLLECTION = "services"

export const openService = async ({ date, type }) => {
  // Check if there's already an open session for today
  const existing = await getDocs(
    query(collection(db, COLLECTION), where("date", "==", date), where("type", "==", type))
  )
  if (!existing.empty) {
    const s = existing.docs[0]
    // If it was closed, reopen it
    if (!s.data().isOpen) {
      await updateDoc(doc(db, COLLECTION, s.id), { isOpen: true })
    }
    return { docId: s.id, ...s.data(), isOpen: true }
  }
  const ref = await addDoc(collection(db, COLLECTION), {
    date, type, isOpen: true, createdAt: new Date().toISOString()
  })
  return { docId: ref.id, date, type, isOpen: true }
}

export const closeService = async (docId) => {
  await updateDoc(doc(db, COLLECTION, docId), { isOpen: false })
}

export const deleteService = async (docId) => {
  await deleteDoc(doc(db, COLLECTION, docId))
}

export const getAllServices = async () => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("date", "desc"))
  )
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export const getOpenService = async () => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("isOpen", "==", true), limit(1))
  )
  if (snap.empty) return null
  return { docId: snap.docs[0].id, ...snap.docs[0].data() }
}