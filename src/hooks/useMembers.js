import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"

// Global singleton — Firestore listener starts once, shared across all components
let globalUnsubscribe = null
let globalMembers = []
let globalLoading = true
const subscribers = new Set()

const notify = () => {
  subscribers.forEach(fn => fn())
}

const startGlobalListener = () => {
  if (globalUnsubscribe) return
  const q = query(collection(db, "members"), orderBy("firstName"))
  globalUnsubscribe = onSnapshot(q, (snap) => {
    globalMembers = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
    globalLoading = false
    notify()
  })
}

export const useMembers = () => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1)
    subscribers.add(handler)
    startGlobalListener()
    return () => subscribers.delete(handler)
  }, [])

  const brothers = globalMembers.filter(m => m.category === "brothers")
  const sisters = globalMembers.filter(m => m.category === "sisters")
  const intermediates = globalMembers.filter(m => m.category === "intermediates")

  // refetch is a no-op now — real-time listener handles updates automatically
  const refetch = () => {}

  return {
    members: globalMembers,
    brothers,
    sisters,
    intermediates,
    loading: globalLoading,
    refetch
  }
}