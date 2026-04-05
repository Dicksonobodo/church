import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { getAllServices, openService } from "../firebase/services"
import { getAllMembers } from "../firebase/members"
import { seedMembersToFirestore, clearDuplicateMembers } from "../utils/seedMembers"

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [services, setServices] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [dialog, setDialog] = useState(null)

  const today = new Date().toISOString().split("T")[0]
  const dayName = new Date().toLocaleDateString("en-NG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  })

  const loadData = async () => {
    setMembersLoading(true)
    const [m, s] = await Promise.all([getAllMembers(), getAllServices()])
    setMembers(m)
    setServices(s)
    setMembersLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSeed = async () => {
    // Double-check before seeding
    const current = await getAllMembers()
    if (current.length > 0) {
      setDialog({
        title: "Members already loaded",
        message: `There are already ${current.length} members in the system. If you see duplicates, use the "Fix Duplicates" option instead.`,
        confirmText: "OK",
        onConfirm: () => setDialog(null),
        danger: false
      })
      await loadData()
      return
    }
    setSeeding(true)
    try {
      const result = await seedMembersToFirestore()
      await loadData()
      setDialog({
        title: "Members loaded!",
        message: `Successfully loaded ${result.count} members into the system.`,
        confirmText: "Great!",
        onConfirm: () => setDialog(null),
        danger: false
      })
    } catch (e) {
      setDialog({
        title: "Error",
        message: "Failed to load members: " + e.message,
        confirmText: "OK",
        onConfirm: () => setDialog(null),
        danger: false
      })
    }
    setSeeding(false)
  }

  const handleFixDuplicates = () => {
    setDialog({
      title: "Fix duplicates",
      message: "This will remove all duplicate members keeping only one copy of each. Continue?",
      confirmText: "Fix now",
      danger: true,
      onConfirm: async () => {
        setDialog(null)
        setFixing(true)
        const result = await clearDuplicateMembers()
        await loadData()
        setFixing(false)
        setDialog({
          title: "Done!",
          message: `Removed ${result.removed} duplicates. ${result.remaining} members remain.`,
          confirmText: "OK",
          onConfirm: () => setDialog(null),
          danger: false
        })
      }
    })
  }

  const handleOpenSunday = async () => {
    const service = await openService({ date: today, type: "sunday" })
    navigate(`/attendance/${service.docId}`)
  }

  const hasDuplicates = members.length > 102

  const brothers = members.filter(m => m.category === "brothers").length
  const sisters = members.filter(m => m.category === "sisters").length
  const teens = members.filter(m => m.category === "intermediates").length

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div>
            <p className="font-bold text-gray-900">RCCG Church of Christ</p>
            <p className="text-xs text-gray-400">{dayName}</p>
          </div>
          <button onClick={logout}
            className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-5 space-y-4">

        {/* LOADING STATE */}
        {membersLoading && (
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        )}

        {/* LOAD MEMBERS - only show if truly empty */}
        {!membersLoading && members.length === 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 text-center">
            <p className="text-white font-bold mb-1">No members loaded</p>
            <p className="text-gray-400 text-xs mb-4">Import all 102 members into the system</p>
            <button onClick={handleSeed} disabled={seeding}
              className="bg-white text-gray-900 font-bold text-sm px-8 py-3 rounded-xl w-full disabled:opacity-60">
              {seeding ? "Loading... please wait" : "Load All 102 Members"}
            </button>
          </div>
        )}

        {/* DUPLICATES WARNING */}
        {!membersLoading && hasDuplicates && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 font-semibold text-sm">Duplicate members detected</p>
            <p className="text-amber-600 text-xs mt-0.5 mb-3">
              {members.length} members found, expected 102. Click below to clean up.
            </p>
            <button onClick={handleFixDuplicates} disabled={fixing}
              className="bg-amber-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl w-full disabled:opacity-60">
              {fixing ? "Fixing..." : "Fix Duplicates Now"}
            </button>
          </div>
        )}

        {/* OPEN SUNDAY */}
        <button onClick={handleOpenSunday}
          className="w-full bg-black text-white rounded-2xl py-5 font-bold text-base hover:bg-gray-900">
          Open Sunday Attendance
        </button>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Brothers", value: brothers },
            { label: "Sisters", value: sisters },
            { label: "Teens", value: teens },
          ].map(s => (
            <div key={s.label} className="border border-gray-100 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* NAV CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/members")}
            className="border border-gray-100 rounded-2xl p-4 text-left hover:bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm">Members</p>
            <p className="text-xs text-gray-400 mt-0.5">{members.length} registered</p>
          </button>
          <button onClick={() => navigate("/report")}
            className="border border-gray-100 rounded-2xl p-4 text-left hover:bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm">Reports</p>
            <p className="text-xs text-gray-400 mt-0.5">{services.length} sessions</p>
          </button>
          <button onClick={() => navigate("/new-converts")}
            className="border border-gray-100 rounded-2xl p-4 text-left hover:bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm">New Converts</p>
            <p className="text-xs text-gray-400 mt-0.5">Track & follow up</p>
          </button>
          <button onClick={() => navigate("/members")}
            className="border border-gray-100 rounded-2xl p-4 text-left hover:bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm">Add Member</p>
            <p className="text-xs text-gray-400 mt-0.5">Register new member</p>
          </button>
        </div>

        {/* PAST SESSIONS */}
        {services.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Past Sessions</p>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              {services.slice(0, 8).map((s, i) => (
                <button key={s.docId}
                  onClick={() => navigate(`/attendance/${s.docId}`)}
                  className={`w-full flex justify-between items-center px-4 py-4 hover:bg-gray-50 text-left ${
                    i < Math.min(services.length, 8) - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(s.date + "T12:00:00").toLocaleDateString("en-NG", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{s.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      s.isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {s.isOpen ? "Open" : "Closed"}
                    </span>
                    <span className="text-gray-300">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DIALOG MODAL */}
      {dialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <div>
              <p className="font-bold text-gray-900 text-base">{dialog.title}</p>
              <p className="text-sm text-gray-500 mt-1">{dialog.message}</p>
            </div>
            <button
              onClick={dialog.onConfirm}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white ${
                dialog.danger ? "bg-red-500" : "bg-black"
              }`}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}