import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { collection, getDocs, query, where, addDoc, limit } from "firebase/firestore"
import { db } from "../firebase/config"

export default function CheckIn() {
  const { qrCode } = useParams()
  const [status, setStatus] = useState("loading")
  const [member, setMember] = useState(null)
  const [serviceDate, setServiceDate] = useState(null)
  const [ran, setRan] = useState(false)

  useEffect(() => {
    if (ran) return
    setRan(true)
    handleCheckIn()
  }, [])

  const handleCheckIn = async () => {
    try {
      console.log("=== CHECK IN START ===", qrCode)

      // 1. Find member
      const memberSnap = await getDocs(
        query(collection(db, "members"), where("qrCode", "==", qrCode))
      )
      if (memberSnap.empty) { setStatus("not-found"); return }
      const memberData = { docId: memberSnap.docs[0].id, ...memberSnap.docs[0].data() }
      setMember(memberData)
      console.log("Member found:", memberData.firstName)

      // 2. Find open service
      const serviceSnap = await getDocs(
        query(collection(db, "services"), where("isOpen", "==", true), limit(1))
      )
      if (serviceSnap.empty) { setStatus("no-session"); return }
      const service = { docId: serviceSnap.docs[0].id, ...serviceSnap.docs[0].data() }
      setServiceDate(service.date)
      console.log("Service found:", service.docId, service.date)

      // 3. Check existing attendance
      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("serviceId", "==", service.docId))
      )
      console.log("Total attendance records for this service:", attSnap.docs.length)
      const allRecords = attSnap.docs.map(d => d.data())
      console.log("Records:", allRecords)

      const alreadyMarked = allRecords.some(r => r.memberId === qrCode)
      console.log("Already marked?", alreadyMarked)

      if (alreadyMarked) {
        setStatus("already")
        return
      }

      // 4. Write attendance
      console.log("Writing attendance record...")
      const docRef = await addDoc(collection(db, "attendance"), {
        memberId: qrCode,
        serviceId: service.docId,
        date: service.date,
        category: memberData.category,
        method: "link",
        timestamp: new Date().toISOString()
      })
      console.log("Written with ID:", docRef.id)
      console.log("=== CHECK IN DONE ===")

      setStatus("success")
    } catch (e) {
      console.error("CheckIn error:", e)
      setStatus("error")
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-NG", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    })
  }

  const categoryLabel = (cat) => {
    if (cat === "brothers") return "Brother"
    if (cat === "sisters") return "Sister"
    return "Teen"
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-6">

        <div>
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">R</span>
          </div>
          <p className="font-bold text-gray-900">RCCG Church of Christ</p>
          {serviceDate && <p className="text-xs text-gray-400 mt-0.5">{formatDate(serviceDate)}</p>}
        </div>

        {status === "loading" && (
          <div className="space-y-3">
            <div className="w-12 h-12 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Checking you in...</p>
          </div>
        )}

        {status === "success" && member && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">You're in!</p>
              <p className="text-sm text-gray-500 mt-1">Welcome, {member.firstName} {member.lastName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{categoryLabel(member.category)}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400">Marked present for</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(serviceDate)}</p>
            </div>
            <p className="text-xs text-gray-400">God bless you. See you in the sanctuary!</p>
          </div>
        )}

        {status === "already" && member && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">Already marked!</p>
              <p className="text-sm text-gray-500 mt-1">{member.firstName}, you're already present for today.</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400">Session</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(serviceDate)}</p>
            </div>
            <p className="text-xs text-gray-400">Enjoy the service!</p>
          </div>
        )}

        {status === "no-session" && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">No service open</p>
              <p className="text-sm text-gray-500 mt-1">There is no Sunday session open right now.</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs text-amber-700">Check back on Sunday when the admin opens the session.</p>
            </div>
          </div>
        )}

        {status === "not-found" && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className="text-xl font-bold text-gray-900">Link not recognised</p>
            <p className="text-sm text-gray-500">Please contact the church admin.</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-xl font-bold text-gray-900">Something went wrong</p>
            <p className="text-sm text-gray-500">Please try again or contact the admin.</p>
            <button onClick={handleCheckIn} className="w-full bg-black text-white rounded-xl py-3 text-sm font-bold">
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}