import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllProducts } from '../lib/products'
import { useAppStore } from '../store/useAppStore'
import { scannerConfigured, MissingScanditKeyError } from '../lib/scandit'
import {
  startShelfScan,
  type ShelfMatcher,
  type ShelfScanCleanup,
} from '../lib/shelfScanner'

interface ShelfScannerProps {
  onClose: () => void
}

function friendlyCameraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/permission|notallowed|denied/i.test(msg)) {
    return 'Camera permission was denied. Allow camera access in your browser, then try again.'
  }
  if (/no camera|notfound|not found|no .*device/i.test(msg)) {
    return 'No camera was found on this device. Try a phone or a laptop with a webcam.'
  }
  return msg || 'The shelf scanner could not start. Please try again.'
}

export default function ShelfScanner({ onClose }: ShelfScannerProps) {
  const shoppingList = useAppStore((s) => s.shoppingList)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Static catalogue lookup: barcode (product_code) → product. Built once.
  const codeToProduct = useMemo(
    () => new Map(getAllProducts().map((p) => [p.product_code, p])),
    [],
  )

  // Wishlist as a Set of product_ids for O(1) membership during live AR frames.
  const wishlistIds = useMemo(
    () => new Set(shoppingList.map((i) => i.productId)),
    [shoppingList],
  )
  const isEmptyWishlist = wishlistIds.size === 0

  // The matcher is read every frame via a ref, so list edits take effect live
  // without tearing down and recreating the AR view.
  const matcherRef = useRef<ShelfMatcher>({
    isMatch: () => false,
    labelFor: () => null,
  })
  useEffect(() => {
    matcherRef.current = {
      isMatch: (code) => {
        const product = codeToProduct.get(code)
        return product ? wishlistIds.has(product.product_id) : false
      },
      labelFor: (code) => codeToProduct.get(code)?.name ?? null,
    }
  }, [codeToProduct, wishlistIds])

  // Start the AR session once; tear it down on unmount.
  useEffect(() => {
    if (!scannerConfigured()) {
      setError(new MissingScanditKeyError().message)
      return
    }
    const container = containerRef.current
    if (!container) return

    let cleanup: ShelfScanCleanup | undefined
    let cancelled = false

    startShelfScan(container, () => matcherRef.current)
      .then((fn) => {
        if (cancelled) void fn()
        else cleanup = fn
      })
      .catch((err: unknown) => setError(friendlyCameraError(err)))

    return () => {
      cancelled = true
      void cleanup?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* AR camera + overlays mount here (BarcodeArView manages the camera). */}
      <div ref={containerRef} className="absolute inset-0" />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[101] rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow"
      >
        ✕ Close
      </button>

      {!error && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[101] flex justify-center px-4">
          <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            Point at a shelf — items on your list glow green
          </span>
        </div>
      )}

      {/* Empty-wishlist prompt: nothing to highlight until the list has items. */}
      {!error && isEmptyWishlist && (
        <div className="absolute inset-x-0 bottom-10 z-[101] flex justify-center px-6">
          <div className="max-w-sm rounded-2xl bg-amber/95 px-5 py-4 text-center text-sm font-medium text-white shadow-lg">
            <p className="text-base font-bold">Add items to your wishlist first!</p>
            <p className="mt-1 text-white/90">
              Add products to your list, then point the camera at a shelf to see
              your items highlighted.
            </p>
          </div>
        </div>
      )}

      {/* Camera / setup error with retry + close. */}
      {error && (
        <div className="absolute inset-0 z-[102] flex items-center justify-center bg-black/80 px-6">
          <div className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg">
            <p className="text-sm text-gray-700">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              {scannerConfigured() && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    // Re-mount the effect by toggling: simplest is to reload the
                    // overlay — closing and reopening restarts cleanly.
                    onClose()
                  }}
                  className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-dark"
                >
                  Close &amp; retry
                </button>
              )}
              {!scannerConfigured() && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-dark"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
