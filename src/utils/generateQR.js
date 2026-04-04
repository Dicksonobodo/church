export const generateQRCode = () => {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `MBR-${num}`
}