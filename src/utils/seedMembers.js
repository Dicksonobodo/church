import { collection, getDocs, writeBatch, doc, deleteDoc, limit, query } from "firebase/firestore"
import { db } from "../firebase/config"
import membersData from "../data/members.json"

export const seedMembersToFirestore = async () => {
  // Check if ANY members exist — if yes, never seed again
  const existing = await getDocs(query(collection(db, "members"), limit(1)))
  if (!existing.empty) {
    const all = await getDocs(collection(db, "members"))
    return { skipped: true, count: all.size }
  }

  const batch = writeBatch(db)
  membersData.forEach((member) => {
    const ref = doc(collection(db, "members"))
    batch.set(ref, { ...member, dateAdded: new Date().toISOString() })
  })
  await batch.commit()
  return { seeded: true, count: membersData.length }
}

export const clearDuplicateMembers = async () => {
  const snap = await getDocs(collection(db, "members"))
  const all = snap.docs.map(d => ({ docId: d.id, ...d.data() }))

  const seen = {}
  const toDelete = []
  all.forEach(m => {
    const key = m.qrCode || `${m.firstName}-${m.lastName}`
    if (seen[key]) {
      toDelete.push(m.docId)
    } else {
      seen[key] = true
    }
  })

  await Promise.all(toDelete.map(id => deleteDoc(doc(db, "members", id))))
  return { removed: toDelete.length, remaining: all.length - toDelete.length }
}