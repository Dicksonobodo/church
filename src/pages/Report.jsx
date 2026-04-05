import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { getAllServices } from "../firebase/services"
import { getAttendanceByService } from "../firebase/attendance"
import { getConvertsByService } from "../firebase/converts"
import { useMembers } from "../hooks/useMembers"
import { getAbsentees, exportToCSV } from "../utils/reportHelpers"
import { useReactToPrint } from "react-to-print"

const TABS = ["summary", "present", "absent", "converts", "visitors"]

export default function Report() {
  const navigate = useNavigate()
  const { members } = useMembers()
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [converts, setConverts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")
  const [sessionSearch, setSessionSearch] = useState("")
  const [showSessionList, setShowSessionList] = useState(false)
  const printRef = useRef()
  const searchRef = useRef()

  const handleSelectService = async (service) => {
    if (!service) return
    setSelectedService(service)
    setShowSessionList(false)
    setSessionSearch("")
    setLoading(true)
    const [att, conv] = await Promise.all([
      getAttendanceByService(service.docId),
      getConvertsByService(service.docId)
    ])
    setAttendance(att)
    setConverts(conv)
    setLoading(false)
  }

  useEffect(() => {
    getAllServices().then(s => {
      setServices(s)
      if (s.length > 0) handleSelectService(s[0])
    })
  }, [])

  useEffect(() => {
    if (showSessionList && searchRef.current) {
      searchRef.current.focus()
    }
  }, [showSessionList])

  const handlePrint = useReactToPrint({ content: () => printRef.current })

  const formatDate = (dateStr) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("en-NG", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    })

  const filteredSessions = services.filter(s =>
    sessionSearch === "" ||
    formatDate(s.date).toLowerCase().includes(sessionSearch.toLowerCase())
  )

  const presentIds = attendance.map(a => a.memberId)
  const absentees = getAbsentees(members, presentIds)
  const presentMembers = members.filter(m => presentIds.includes(m.qrCode))
  const newConverts = converts.filter(c => c.type === "new_convert")
  const visitors = converts.filter(c => c.type === "visitor")

  const totals = {
    total: attendance.length,
    brothers: attendance.filter(a => a.category === "brothers").length,
    sisters: attendance.filter(a => a.category === "sisters").length,
    intermediates: attendance.filter(a => a.category === "intermediates").length,
  }

  const groupByCategory = (list) => ({
    brothers: list.filter(m => m.category === "brothers"),
    sisters: list.filter(m => m.category === "sisters"),
    intermediates: list.filter(m => m.category === "intermediates"),
  })

  const presentByCategory = groupByCategory(presentMembers)
  const absentByCategory = groupByCategory(absentees)

  const MemberList = ({ grouped, emptyMsg }) => {
    const cats = ["brothers", "sisters", "intermediates"]
    const hasAny = cats.some(c => grouped[c]?.length > 0)
    if (!hasAny) return <p className="text-center text-gray-400 py-8 text-sm">{emptyMsg}</p>
    return (
      <div>
        {cats.map(cat => (
          grouped[cat]?.length > 0 && (
            <div key={cat}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5 bg-gray-50">
                {cat === "intermediates" ? "Teens" : cat} — {grouped[cat].length}
              </p>
              {grouped[cat].map(m => (
                <div key={m.docId} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                    {m.firstName[0]}
                  </div>
                  <p className="text-sm text-gray-800">{m.firstName} {m.lastName}</p>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-5 py-4 sticky top-0 bg-white z-10">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
          <p className="font-bold text-gray-900 text-sm">Report</p>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
              Print
            </button>
            <button onClick={() => exportToCSV(attendance, members, selectedService?.date)}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-5 space-y-4">

        {/* SESSION PICKER */}
        <div className="relative">
          {/* Selected session display + toggle */}
          <button
            onClick={() => setShowSessionList(!showSessionList)}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-left flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Selected session</p>
              <p className="text-sm font-semibold text-gray-900">
                {selectedService ? formatDate(selectedService.date) : "Choose a session"}
              </p>
            </div>
            <span className={`text-gray-400 text-lg transition-transform ${showSessionList ? "rotate-180" : ""}`}>
              ›
            </span>
          </button>

          {/* Dropdown panel */}
          {showSessionList && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden">
              {/* Search inside dropdown */}
              <div className="p-3 border-b border-gray-50">
                <input
                  ref={searchRef}
                  type="text"
                  value={sessionSearch}
                  onChange={e => setSessionSearch(e.target.value)}
                  placeholder="Search by date, month, day..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Scrollable list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredSessions.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">No sessions match</p>
                ) : filteredSessions.map((s, i) => (
                  <button
                    key={s.docId}
                    onClick={() => handleSelectService(s)}
                    className={`w-full flex justify-between items-center px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${
                      selectedService?.docId === s.docId ? "bg-gray-50" : ""
                    } ${i < filteredSessions.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <div>
                      <p className={`text-sm ${selectedService?.docId === s.docId ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {formatDate(s.date)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{s.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedService?.docId === s.docId && (
                        <span className="text-xs text-black font-bold">✓</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {s.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Also keep the native dropdown for quick access */}
              <div className="p-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-1.5">Or jump directly</p>
                <select
                  onChange={e => {
                    const s = services.find(s => s.docId === e.target.value)
                    if (s) handleSelectService(s)
                  }}
                  value={selectedService?.docId || ""}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-gray-50"
                >
                  {services.map(s => (
                    <option key={s.docId} value={s.docId}>
                      {formatDate(s.date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Click outside to close */}
          {showSessionList && (
            <div className="fixed inset-0 z-10" onClick={() => setShowSessionList(false)} />
          )}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10 text-sm">Loading report...</p>
        ) : selectedService && (
          <div ref={printRef} className="space-y-4">

            <div className="border border-gray-100 rounded-2xl p-4 text-center">
              <p className="font-bold text-gray-900">RCCG Church of Christ</p>
              <p className="text-sm text-gray-400 mt-0.5">{formatDate(selectedService.date)}</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Total", value: totals.total },
                { label: "Brothers", value: totals.brothers },
                { label: "Sisters", value: totals.sisters },
                { label: "Teens", value: totals.intermediates },
              ].map(s => (
                <div key={s.label} className="border border-gray-100 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Present", value: presentMembers.length, color: "text-green-600" },
                { label: "Absent", value: absentees.length, color: "text-red-500" },
                { label: "Converts", value: newConverts.length, color: "text-blue-600" },
                { label: "Visitors", value: visitors.length, color: "text-amber-600" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                    activeTab === tab ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="border border-gray-100 rounded-2xl overflow-hidden">

              {activeTab === "summary" && (
                <div className="p-4 space-y-0">
                  {[
                    { label: "Total present", value: totals.total, sub: "across all categories" },
                    { label: "Brothers present", value: totals.brothers, sub: `out of ${members.filter(m => m.category === "brothers").length}` },
                    { label: "Sisters present", value: totals.sisters, sub: `out of ${members.filter(m => m.category === "sisters").length}` },
                    { label: "Teens present", value: totals.intermediates, sub: `out of ${members.filter(m => m.category === "intermediates").length}` },
                    { label: "New converts", value: newConverts.length, sub: "saved this Sunday" },
                    { label: "Visitors", value: visitors.length, sub: "guests this Sunday" },
                    { label: "Total absentees", value: absentees.length, sub: "members not present" },
                  ].map((row, i, arr) => (
                    <div key={row.label}
                      className={`flex justify-between items-center py-3 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{row.label}</p>
                        <p className="text-xs text-gray-400">{row.sub}</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{row.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "present" && (
                <MemberList grouped={presentByCategory} emptyMsg="No members marked present yet" />
              )}

              {activeTab === "absent" && (
                <MemberList grouped={absentByCategory} emptyMsg="No absentees" />
              )}

              {activeTab === "converts" && (
                newConverts.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No new converts this Sunday</p>
                ) : newConverts.map((c, i) => (
                  <div key={c.docId}
                    className={`px-4 py-4 ${i < newConverts.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>}
                        {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                      </div>
                      <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                        New convert
                      </span>
                    </div>
                  </div>
                ))
              )}

              {activeTab === "visitors" && (
                visitors.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No visitors this Sunday</p>
                ) : visitors.map((c, i) => (
                  <div key={c.docId}
                    className={`px-4 py-4 ${i < visitors.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>}
                        {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                      </div>
                      <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                        Visitor
                      </span>
                    </div>
                  </div>
                ))
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}