import { useState, useEffect, useCallback } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"
import { markPresent } from "../firebase/attendance"

export const useAttendance = (serviceId) => {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!serviceId) return

    // Real-time listener — updates instantly when any device marks attendance
    const q = query(
      collection(db, "attendance"),
      where("serviceId", "==", serviceId)
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
      setAttendance(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [serviceId])

  const markMemberPresent = useCallback(async ({ memberId, date, category, method }) => {
    const result = await markPresent({ memberId, serviceId, date, category, method })
    return result
  }, [serviceId])

  const presentIds = attendance.map(a => a.memberId)

  const totals = {
    total: attendance.length,
    brothers: attendance.filter(a => a.category === "brothers").length,
    sisters: attendance.filter(a => a.category === "sisters").length,
    intermediates: attendance.filter(a => a.category === "intermediates").length,
  }

  return { attendance, presentIds, totals, loading, markMemberPresent, refetch: () => {} }
}