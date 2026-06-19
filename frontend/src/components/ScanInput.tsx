import { useEffect, useRef, useState } from 'react'
import {
  scannerConfigured,
  startScan,
  MissingScanditKeyError,
  type ScanCleanup,
} from '../lib/scandit'

interface ScanInputProps {
  onScan: (code: string) => void
}

/** Turn a raw camera/SDK error into a clear, actionable message. */
function friendlyCameraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/permission|notallowed|denied/i.test(msg)) {
    return 'Camera permission was denied. Allow camera access in your browser, then try again.'
  }
  if (/no camera|notfound|not found|no .*device/i.test(msg)) {
    return 'No camera was found on this device. Try a phone or a laptop with a webcam.'
  }
  return msg || 'The camera could not be started. Please try again.'
}

export default function ScanInput({ onScan }: ScanInputProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  function beginScan() {
    if (!scannerConfigured()) {
      // No key: surface a clear error rather than silently failing.
      setError(new MissingScanditKeyError().message)
      return
    }
    setError(null)
    setScanning(true)
  }

  // Camera scan-session lifecycle: start on open, tear down on close/scan.
  useEffect(() => {
    if (!scanning) return
    const container = containerRef.current
    if (!container) return

    let cleanup: ScanCleanup | undefined
    let cancelled = false

    startScan(container, (code) => {
      onScan(code)
      setScanning(false) // closing the overlay runs cleanup below
    })
      .then((fn) => {
        if (cancelled) void fn()
        else cleanup = fn
      })
      .catch((err: unknown) => {
        setError(friendlyCameraError(err))
        setScanning(false)
      })

    return () => {
      cancelled = true
      void cleanup?.()
    }
  }, [scanning, onScan])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualValue.trim()
    if (!trimmed) return
    onScan(trimmed)
    setManualValue('')
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm border border-slate-bg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-forest">Scan a barcode</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Point your camera at a product barcode to look it up.
          </p>
        </div>
        <button
          type="button"
          onClick={beginScan}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
          Scan barcode
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-amber/40 bg-amber/10 p-3 text-xs text-amber-dark">
          <p>{error}</p>
          {scannerConfigured() && (
            <button
              type="button"
              onClick={beginScan}
              className="mt-2 rounded-lg bg-forest px-3 py-1.5 font-semibold text-white hover:bg-forest-dark"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* De-emphasised developer fallback — not the primary path. */}
      <div className="mt-3 border-t border-slate-bg pt-2">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
        >
          No camera? Enter a code manually (dev only)
        </button>
        {manualOpen && (
          <form onSubmit={submitManual} className="mt-2 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="e.g. 127396746875"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
            <button
              type="submit"
              className="rounded-lg bg-forest-50 px-4 py-2 text-sm font-semibold text-forest hover:bg-forest-50/70"
            >
              Look up
            </button>
          </form>
        )}
      </div>

      {/* Full-screen camera overlay. The capture element must be positioned with
          non-zero dimensions for the preview to render. */}
      {scanning && (
        <div className="fixed inset-0 z-[100] bg-black">
          <div ref={containerRef} className="absolute inset-0" />
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="absolute right-4 top-4 z-[101] rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow"
          >
            ✕ Cancel
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-[101] text-center">
            <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
              Point at a barcode — EAN-13, QR or Code 128
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
