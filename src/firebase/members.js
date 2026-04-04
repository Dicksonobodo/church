import { db } from "./config"
import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, orderBy, writeBatch
} from "firebase/firestore"

const COLLECTION = "members"

export const getAllMembers = async () => {
  const q = query(collection(db, COLLECTION), orderBy("firstName"))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export const addMember = async (member) => {
  return await addDoc(collection(db, COLLECTION), {
    ...member,
    dateAdded: new Date().toISOString()
  })
}

export const updateMember = async (docId, data) => {
  await updateDoc(doc(db, COLLECTION, docId), data)
}

export const deleteMember = async (docId) => {
  await deleteDoc(doc(db, COLLECTION, docId))
}

export const seedMembers = async (members) => {
  const batch = writeBatch(db)
  members.forEach((member) => {
    const ref = doc(collection(db, COLLECTION))
    batch.set(ref, { ...member, dateAdded: new Date().toISOString() })
  })
  await batch.commit()
}