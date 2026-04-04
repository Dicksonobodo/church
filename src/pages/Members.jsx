import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMembers } from "../hooks/useMembers"
import { addMember, deleteMember, updateMember } from "../firebase/members"
import { generateQRCode } from "../utils/generateQR"
import { QRCodeSVG } from "qrcode.react"

const CATEGORY_COLORS = {
  brothers: "bg-blue-50 text-blue-700",
  sisters: "bg-pink-50 text-pink-700",
  intermediates: "bg-amber-50 text-amber-700"
}

export default function Members() {
  const navigate = useNavigate()
  const { members, loading, refetch } = useMembers()
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("brothers")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showQR, setShowQR] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [newMember, setNewMember] = useState({ firstName: "", lastName: "", phone: "", category: "brothers" })
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newMember.firstName) return
    setSaving(true)
    await addMember({ ...newMember, qrCode: generateQRCode(), status: "active" })
    await refetch()
    setNewMember({ firstName: "", lastName: "", phone: "", category: "brothers" })
    setShowAddForm(false)
    setSaving(false)
  }

  const handleDelete = async (docId, name) => {
    if (!confirm(`Remove ${name}?`)) return
    await deleteMember(docId)
    await refetch()
  }

  const handleEditSave = async () => {
    if (!editingMember) return
    setSaving(true)
    await updateMember(editingMember.docId, {
      firstName: editingMember.firstName,
      lastName: editingMember.lastName,
      phone: editingMember.phone,
      category: editingMember.category,
    })
    await refetch()
    setEditingMember(null)
    setSaving(false)
  }

  const filtered = members
    .filter(m => m.category === activeTab)
    .filter(m => search === "" || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    brothers: members.filter(m => m.category === "brothers").length,
    sisters: members.filter(m => m.category === "sisters").length,
    intermediates: members.filter(m => m.category === "intermediates").length,
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-5 py-4 sticky top-0 bg-white z-10">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
          <p className="font-bold text-gray-900 text-sm">Members ({members.length})</p>
          <button onClick={() => setShowAddForm(true)}
            className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-medium">
            + Add
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-5 space-y-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search member..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
        />

        <div className="flex gap-2">
          {["brothers", "sisters", "intermediates"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab ? "bg-black text-white" : "bg-gray-50 text-gray-500"
              }`}
            >
              {tab === "intermediates" ? "Teens" : tab} ({counts[tab]})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-gray-400 py-10 text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No members found</p>
          ) : filtered.map(member => (
            <div key={member.docId} className="border border-gray-100 rounded-2xl px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {member.firstName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[member.category]}`}>
                        {member.category === "intermediates" ? "Teen" : member.category.slice(0, -1)}
                      </span>
                      {member.phone
                        ? <span className="text-xs text-gray-400">{member.phone}</span>
                        : <span className="text-xs text-gray-300">No phone</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditingMember({ ...member })}
                    className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
                    Edit
                  </button>
                  <button onClick={() => setShowQR(member)}
                    className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
                    QR
                  </button>
                  <button onClick={() => handleDelete(member.docId, `${member.firstName} ${member.lastName}`)}
                    className="text-xs border border-red-100 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-50">
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD MEMBER FORM */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-3 max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-gray-900">Add New Member</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 text-sm">Cancel</button>
            </div>
            <input type="text" placeholder="First name *" value={newMember.firstName}
              onChange={e => setNewMember({ ...newMember, firstName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <input type="text" placeholder="Last name" value={newMember.lastName}
              onChange={e => setNewMember({ ...newMember, lastName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <input type="tel" placeholder="Phone number" value={newMember.phone}
              onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <select value={newMember.category} onChange={e => setNewMember({ ...newMember, category: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50">
              <option value="brothers">Brothers</option>
              <option value="sisters">Sisters</option>
              <option value="intermediates">Intermediates (Teens)</option>
            </select>
            <button onClick={handleAdd} disabled={saving}
              className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Add Member"}
            </button>
          </div>
        </div>
      )}

      {/* EDIT MEMBER FORM */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-3 max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-gray-900">Edit Member</h3>
              <button onClick={() => setEditingMember(null)} className="text-gray-400 text-sm">Cancel</button>
            </div>
            <input type="text" placeholder="First name *" value={editingMember.firstName}
              onChange={e => setEditingMember({ ...editingMember, firstName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <input type="text" placeholder="Last name" value={editingMember.lastName}
              onChange={e => setEditingMember({ ...editingMember, lastName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <input type="tel" placeholder="Phone number" value={editingMember.phone || ""}
              onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50" />
            <select value={editingMember.category}
              onChange={e => setEditingMember({ ...editingMember, category: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50">
              <option value="brothers">Brothers</option>
              <option value="sisters">Sisters</option>
              <option value="intermediates">Intermediates (Teens)</option>
            </select>
            <button onClick={handleEditSave} disabled={saving}
              className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* QR CODE */}
      {showQR && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 text-center w-full max-w-xs space-y-4">
            <div>
              <p className="font-bold text-gray-900">RCCG House of Praise</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{showQR.firstName} {showQR.lastName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[showQR.category]}`}>
                {showQR.category === "intermediates" ? "Teen" : showQR.category.slice(0, -1)}
              </span>
            </div>
            <div className="flex justify-center p-4 bg-gray-50 rounded-2xl">
              <QRCodeSVG value={showQR.qrCode} size={180} />
            </div>
            <p className="text-xs text-gray-400 font-mono">{showQR.qrCode}</p>

            <div className="bg-gray-50 rounded-xl p-3 text-left">
              <p className="text-xs text-gray-400 mb-1">WhatsApp check-in link</p>
              <p className="text-xs font-mono text-gray-700 break-all">
                {window.location.origin}/checkin/{showQR.qrCode}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/checkin/${showQR.qrCode}`)
                  alert("Link copied! Send this to the member on WhatsApp.")
                }}
                className="mt-2 w-full bg-gray-200 text-gray-700 rounded-lg py-1.5 text-xs font-semibold hover:bg-gray-300"
              >
                Copy link
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => window.print()}
                className="border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600">Print QR</button>
              <button onClick={() => setShowQR(null)}
                className="bg-black text-white rounded-xl py-2.5 text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}