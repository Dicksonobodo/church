import { db } from "./config"
import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, orderBy
} from "firebase/firestore"

const COLLECTION = "attendance"

export const markPresent = async ({ memberId, serviceId, date, category, method }) => {
  // Check duplicates by fetching all attendance for this service
  // then filtering in JS — avoids needing a composite Firestore index
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("serviceId", "==", serviceId))
  )
  const alreadyExists = snap.docs.some(d => d.data().memberId === memberId)
  if (alreadyExists) return { alreadyMarked: true }

  await addDoc(collection(db, COLLECTION), {
    memberId, serviceId, date, category,
    method, timestamp: new Date().toISOString()
  })
  return { alreadyMarked: false }
}

export const getAttendanceByService = async (serviceId) => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("serviceId", "==", serviceId))
  )
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export const getAllAttendance = async () => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("timestamp", "desc"))
  )
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export const clearServiceAttendance = async (serviceId) => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("serviceId", "==", serviceId))
  )
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, COLLECTION, d.id))))
}