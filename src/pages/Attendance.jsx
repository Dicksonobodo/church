import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { useMembers } from "../hooks/useMembers"
import { useAttendance } from "../hooks/useAttendance"
import { closeService, deleteService, getAllServices } from "../firebase/services"
import { clearServiceAttendance } from "../firebase/attendance"
import { addConvert } from "../firebase/converts"

const CATEGORY_COLORS = {
  brothers: "bg-blue-50 text-blue-700",
  sisters: "bg-pink-50 text-pink-700",
  intermediates: "bg-amber-50 text-amber-700"
}

export default function Attendance() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { members, loading: membersLoading } = useMembers()
  const { presentIds, totals, markMemberPresent, refetch } = useAttendance(serviceId)
  const [service, setService] = useState(null)
  const [activeTab, setActiveTab] = useState("brothers")
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [showConvertForm, setShowConvertForm] = useState(false)
  const [convertType, setConvertType] = useState("new_convert")
  const [convertData, setConvertData] = useState({ name: "", phone: "", address: "" })
  const [showMenu, setShowMenu] = useState(false)
  const [dialog, setDialog] = useState(null)
  const scannerRef = useRef(null)
  const lastScanTime = useRef(0)
  const lastScanCode = useRef("")

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const confirm = (title, message, onConfirm, danger = false) => {
    setDialog({ title, message, onConfirm, danger })
  }

  useEffect(() => {
    getAllServices().then(services => {
      const s = services.find(s => s.docId === serviceId)
      if (s) setService(s)
    })
  }, [serviceId])

  const handleScan = useCallback(async (decodedText) => {
    const now = Date.now()
    // Debounce: ignore same code within 3 seconds
    if (decodedText === lastScanCode.current && now - lastScanTime.current < 3000) return
    lastScanCode.current = decodedText
    lastScanTime.current = now

    const member = members.find(m => m.qrCode === decodedText)
    if (!member) {
      setLastScanned({ error: true, msg: "QR code not recognised" })
      showToast("QR code not recognised", "error")
      return
    }
    if (presentIds.includes(member.qrCode)) {
      setLastScanned({ error: true, msg: `${member.firstName} already marked` })
      showToast(`${member.firstName} already marked`, "info")
      return
    }
    const result = await markMemberPresent({
      memberId: member.qrCode,
      date: service?.date,
      category: member.category,
      method: "qr"
    })
    if (!result.alreadyMarked) {
      setLastScanned({ success: true, member })
      showToast(`${member.firstName} ${member.lastName} — Present!`, "success")
    }
  }, [members, presentIds, markMemberPresent, service?.date])

  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner("qr-reader", {
        fps: 5,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        facingMode: "environment",
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      }, false)
      scanner.render(handleScan, () => {})
      scannerRef.current = scanner
    }
    if (!scannerActive && scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
      setLastScanned(null)
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scannerActive, handleScan])

  const handleManualMark = async (member) => {
    if (presentIds.includes(member.qrCode)) {
      showToast(`${member.firstName} already marked`, "info")
      return
    }
    await markMemberPresent({
      memberId: member.qrCode,
      date: service?.date,
      category: member.category,
      method: "manual"
    })
    showToast(`${member.firstName} ${member.lastName} — Present!`, "success")
  }

  const handleCloseSession = () => {
    confirm(
      "Close session",
      "This will close the session and take you to the report. You can still reopen it from the dashboard.",
      async () => {
        await closeService(serviceId)
        navigate("/report")
      }
    )
  }

  const handleResetAttendance = () => {
    confirm(
      "Reset attendance",
      "This will clear ALL attendance marks for this session. This cannot be undone.",
      async () => {
        await clearServiceAttendance(serviceId)
        await refetch()
        setLastScanned(null)
        showToast("Attendance cleared", "info")
        setShowMenu(false)
      },
      true
    )
  }

  const handleDeleteSession = () => {
    confirm(
      "Delete session",
      "This will permanently delete this session and all its attendance records.",
      async () => {
        await clearServiceAttendance(serviceId)
        await deleteService(serviceId)
        navigate("/dashboard")
      },
      true
    )
  }

  const handleAddConvert = async () => {
    if (!convertData.name) return
    await addConvert({ ...convertData, type: convertType, serviceId, date: service?.date })
    showToast(`${convertType === "new_convert" ? "New convert" : "Visitor"} added!`, "success")
    setConvertData({ name: "", phone: "", address: "" })
    setShowConvertForm(false)
  }

  const filteredMembers = members
    .filter(m => m.category === activeTab)
    .filter(m => search === "" ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-5 py-4 sticky top-0 bg-white z-10">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm">
              {service?.date ? new Date(service.date + "T12:00:00").toLocaleDateString("en-NG", {
                weekday: "long", day: "numeric", month: "long"
              }) : "Attendance"}
            </p>
            <p className="text-xs text-gray-400">{totals.total} marked present</p>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50">
              Menu
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl w-52 overflow-hidden z-20">
                  <button onClick={handleCloseSession}
                    className="w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50">
                    Close session
                  </button>
                  <button onClick={handleResetAttendance}
                    className="w-full text-left px-4 py-3.5 text-sm text-amber-600 hover:bg-amber-50 border-b border-gray-50">
                    Reset attendance
                  </button>
                  <button onClick={handleDeleteSession}
                    className="w-full text-left px-4 py-3.5 text-sm text-red-500 hover:bg-red-50">
                    Delete session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg whitespace-nowrap transition-all ${
          toast.type === "success" ? "bg-black text-white" :
          toast.type === "error" ? "bg-red-500 text-white" : "bg-gray-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-xl mx-auto px-5 py-5 space-y-4">

        {/* LIVE TOTALS */}
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

        {/* QR SCANNER */}
        <div>
          <button
            onClick={() => setScannerActive(!scannerActive)}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors ${
              scannerActive ? "bg-red-50 text-red-600 border border-red-200" : "bg-black text-white"
            }`}
          >
            {scannerActive ? "Stop Scanner" : "Scan QR Code"}
          </button>

          {scannerActive && (
            <div className="mt-3 space-y-3">
              <div id="qr-reader" className="rounded-2xl overflow-hidden border border-gray-100" />
              {lastScanned && (
                <div className={`rounded-2xl px-4 py-3 text-center ${
                  lastScanned.success ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                }`}>
                  {lastScanned.success ? (
                    <>
                      <p className="text-sm font-bold text-green-800">
                        {lastScanned.member.firstName} {lastScanned.member.lastName}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {lastScanned.member.category === "intermediates" ? "Teen" : lastScanned.member.category.slice(0, -1)} — Marked present
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-red-600">{lastScanned.msg}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEARCH */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search member name..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50"
        />

        {/* CATEGORY TABS */}
        <div className="flex gap-2">
          {["brothers", "sisters", "intermediates"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === tab ? "bg-black text-white" : "bg-gray-50 text-gray-500"
              }`}
            >
              {tab === "intermediates" ? "Teens" : tab}
            </button>
          ))}
        </div>

        {/* MEMBER LIST */}
        <div className="space-y-2">
          {membersLoading ? (
            <p className="text-center text-gray-400 py-10 text-sm">Loading members...</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No members found</p>
          ) : filteredMembers.map(member => {
            const isPresent = presentIds.includes(member.qrCode)
            return (
              <div key={member.id || member.docId}
                className={`flex items-center justify-between rounded-2xl px-4 py-3.5 border transition-all ${
                  isPresent ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                    isPresent ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {isPresent ? "✓" : member.firstName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[member.category]}`}>
                      {member.category === "intermediates" ? "Teen" : member.category.slice(0, -1)}
                    </span>
                  </div>
                </div>
                {!isPresent ? (
                  <button onClick={() => handleManualMark(member)}
                    className="bg-black text-white text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-800">
                    Present
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">✓ Marked</span>
                )}
              </div>
            )
          })}
        </div>

        {/* NEW CONVERT / VISITOR */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <button onClick={() => { setConvertType("new_convert"); setShowConvertForm(true) }}
            className="border border-gray-200 rounded-2xl py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            + New Convert
          </button>
          <button onClick={() => { setConvertType("visitor"); setShowConvertForm(true) }}
            className="border border-gray-200 rounded-2xl py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            + Visitor
          </button>
        </div>
      </div>

      {/* CONVERT FORM MODAL */}
      {showConvertForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowConvertForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-3 max-w-xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-gray-900">
                {convertType === "new_convert" ? "New Convert" : "Visitor"}
              </h3>
              <button onClick={() => setShowConvertForm(false)} className="text-gray-400 text-sm">Cancel</button>
            </div>
            <input type="text" placeholder="Full name *" value={convertData.name}
              onChange={e => setConvertData({ ...convertData, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <input type="tel" placeholder="Phone number" value={convertData.phone}
              onChange={e => setConvertData({ ...convertData, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <input type="text" placeholder="Address" value={convertData.address}
              onChange={e => setConvertData({ ...convertData, address: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <button onClick={handleAddConvert}
              className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-bold">
              Save
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG MODAL */}
      {dialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <div>
              <p className="font-bold text-gray-900 text-base">{dialog.title}</p>
              <p className="text-sm text-gray-500 mt-1">{dialog.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDialog(null)}
                className="border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={async () => { await dialog.onConfirm(); setDialog(null) }}
                className={`rounded-xl py-3 text-sm font-bold text-white ${
                  dialog.danger ? "bg-red-500 hover:bg-red-600" : "bg-black hover:bg-gray-800"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}