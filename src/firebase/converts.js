import { db } from "./config"
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy
} from "firebase/firestore"

const COLLECTION = "converts"

export const addConvert = async (data) => {
  return await addDoc(collection(db, COLLECTION), {
    ...data,
    followedUp: false,
    createdAt: new Date().toISOString()
  })
}

export const getConvertsByService = async (serviceId) => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("serviceId", "==", serviceId))
  )
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export const getAllConverts = async () => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc"))
  )
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export const markFollowedUp = async (docId) => {
  await updateDoc(doc(db, COLLECTION, docId), { followedUp: true })
}

export const updateConvert = async (docId, data) => {
  await updateDoc(doc(db, COLLECTION, docId), data)
}

export const deleteConvert = async (docId) => {
  await deleteDoc(doc(db, COLLECTION, docId))
}