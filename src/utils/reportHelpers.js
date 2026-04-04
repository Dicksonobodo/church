export const getAbsentees = (allMembers, presentMemberIds) => {
  return allMembers.filter(m => !presentMemberIds.includes(m.qrCode) && m.status === "active")
}

export const getTotalsByCategory = (attendanceList) => {
  return {
    brothers: attendanceList.filter(a => a.category === "brothers").length,
    sisters: attendanceList.filter(a => a.category === "sisters").length,
    intermediates: attendanceList.filter(a => a.category === "intermediates").length,
    total: attendanceList.length
  }
}

export const exportToCSV = (attendance, members, serviceDate) => {
  const rows = [["Name", "Category", "Method", "Time"]]
  attendance.forEach(a => {
    const member = members.find(m => m.qrCode === a.memberId)
    if (member) {
      rows.push([
        `${member.firstName} ${member.lastName}`,
        member.category,
        a.method,
        new Date(a.timestamp).toLocaleTimeString()
      ])
    }
  })
  const csv = rows.map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `attendance-${serviceDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}