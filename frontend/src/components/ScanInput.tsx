import { useState } from 'react'

interface ScanInputProps {
  onScan: (code: string) => void
}

export default function ScanInput({ onScan }: ScanInputProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onScan(trimmed)
    setValue('')
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm border border-slate-bg">
      <label
        htmlFor="scan-barcode"
        className="block text-sm font-semibold text-forest"
      >
        Scan barcode
      </label>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          id="scan-barcode"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a product barcode…"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        <button
          type="submit"
          className="rounded-xl bg-forest px-6 py-3 text-base font-semibold text-white hover:bg-forest-dark"
        >
          Scan
        </button>
      </form>
      <p className="mt-2 text-xs text-gray-500">Tip: try 7610000000011</p>
    </section>
  )
}
