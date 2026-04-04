import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAllConverts, markFollowedUp, updateConvert, deleteConvert } from "../firebase/converts"

export default function NewConverts() {
  const navigate = useNavigate()
  const [converts, setConverts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [editingItem, setEditingItem] = useState(null)
  const [dialog, setDialog] = useState(null)

  const loadConverts = async () => {
    setLoading(true)
    const data = await getAllConverts()
    setConverts(data)
    setLoading(false)
  }

  useEffect(() => { loadConverts() }, [])

  const handleFollowUp = async (docId) => {
    await markFollowedUp(docId)
    setConverts(prev => prev.map(c => c.docId === docId ? { ...c, followedUp: true } : c))
  }

  const handleEditSave = async () => {
    if (!editingItem?.name) return
    await updateConvert(editingItem.docId, {
      name: editingItem.name,
      phone: editingItem.phone,
      address: editingItem.address,
      type: editingItem.type,
    })
    setConverts(prev => prev.map(c => c.docId === editingItem.docId ? { ...c, ...editingItem } : c))
    setEditingItem(null)
  }

  const handleDelete = (item) => {
    setDialog({
      title: `Delete ${item.type === "new_convert" ? "convert" : "visitor"}`,
      message: `Remove ${item.name} from the records? This cannot be undone.`,
      onConfirm: async () => {
        await deleteConvert(item.docId)
        setConverts(prev => prev.filter(c => c.docId !== item.docId))
        setDialog(null)
      }
    })
  }

  const filtered = converts.filter(c => {
    if (filter === "converts") return c.type === "new_convert"
    if (filter === "visitors") return c.type === "visitor"
    return true
  })

  const convertCount = converts.filter(c => c.type === "new_convert").length
  const visitorCount = converts.filter(c => c.type === "visitor").length

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-5 py-4 sticky top-0 bg-white z-10">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
          <p className="font-bold text-gray-900 text-sm">New Converts & Visitors</p>
          <div />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-5 space-y-4">

        {/* FILTER TABS */}
        <div className="flex gap-2">
          {[
            { value: "all", label: `All (${converts.length})` },
            { value: "converts", label: `Converts (${convertCount})` },
            { value: "visitors", label: `Visitors (${visitorCount})` },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                filter === f.value ? "bg-black text-white" : "bg-gray-50 text-gray-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No records found</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.docId} className="border border-gray-100 rounded-2xl px-4 py-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.type === "new_convert"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {c.type === "new_convert" ? "Convert" : "Visitor"}
                      </span>
                    </div>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                    <p className="text-xs text-gray-300 mt-1">{c.date}</p>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-1.5 ml-3">
                    <button
                      onClick={() => setEditingItem({ ...c })}
                      className="text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-xs border border-red-100 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-50"
                    >
                      Del
                    </button>
                  </div>
                </div>

                {/* FOLLOW UP */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className={`text-xs font-medium ${c.followedUp ? "text-green-600" : "text-gray-400"}`}>
                    {c.followedUp ? "✓ Followed up" : "Not followed up"}
                  </span>
                  {!c.followedUp && (
                    <button onClick={() => handleFollowUp(c.docId)}
                      className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-800">
                      Mark followed up
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setEditingItem(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-3 max-w-xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-gray-900">Edit Record</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 text-sm">Cancel</button>
            </div>
            <input
              type="text" placeholder="Full name *" value={editingItem.name}
              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50"
            />
            <input
              type="tel" placeholder="Phone number" value={editingItem.phone || ""}
              onChange={e => setEditingItem({ ...editingItem, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50"
            />
            <input
              type="text" placeholder="Address" value={editingItem.address || ""}
              onChange={e => setEditingItem({ ...editingItem, address: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50"
            />
            <select
              value={editingItem.type}
              onChange={e => setEditingItem({ ...editingItem, type: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-gray-50"
            >
              <option value="new_convert">New Convert</option>
              <option value="visitor">Visitor</option>
            </select>
            <button onClick={handleEditSave}
              className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-bold">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {dialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <div>
              <p className="font-bold text-gray-900">{dialog.title}</p>
              <p className="text-sm text-gray-500 mt-1">{dialog.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDialog(null)}
                className="border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-600">
                Cancel
              </button>
              <button onClick={dialog.onConfirm}
                className="bg-red-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}