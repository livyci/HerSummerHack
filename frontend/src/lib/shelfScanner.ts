import type { BarcodeArView as BarcodeArViewInstance } from '@scandit/web-datacapture-barcode'
import { MissingScanditKeyError } from './scandit'

// Scandit MatrixScan AR (BarcodeAr) integration — multi-barcode shelf scanning.
//
// Wired by hand per the scandit/skills `matrixscan-ar-web` guide. BarcodeArView
// tracks every barcode in view at once and manages its own camera; we drive
// per-barcode AR overlays through highlight/annotation providers (callback
// pattern). Real-time wishlist matching is delegated to a matcher the caller
// supplies, queried fresh per barcode so overlays always reflect the live list.
//
// Requires VITE_SCANDIT_LICENSE_KEY and browser multithreading (COOP/COEP
// headers — see vite.config.ts). The SDK is imported lazily to keep it off the
// initial bundle.

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY as string | undefined
const LIBRARY_LOCATION =
  'https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/'

export type ShelfScanCleanup = () => Promise<void>

/** Decides, per scanned barcode, whether it's on the wishlist and how to label it. */
export interface ShelfMatcher {
  isMatch: (barcodeData: string) => boolean
  labelFor: (barcodeData: string) => string | null
}

type CoreModule = typeof import('@scandit/web-datacapture-core')
type BarcodeModule = typeof import('@scandit/web-datacapture-barcode')

// The web SDK accepts `callback(null)` to render no overlay for a barcode, but
// its TypeScript types declare the callback param non-null (a known typing gap
// documented in the matrixscan-ar-web skill). Widen at the call site — no `any`.
function showNothing<T>(callback: (value: T) => void): void {
  ;(callback as (value: T | null) => void)(null)
}

// Memoised context init so forLicenseKey runs at most once for AR sessions.
let contextPromise: Promise<{ core: CoreModule; barcode: BarcodeModule }> | null = null

function ensureContext(): Promise<{ core: CoreModule; barcode: BarcodeModule }> {
  if (!LICENSE_KEY) return Promise.reject(new MissingScanditKeyError())
  if (!contextPromise) {
    contextPromise = (async () => {
      const [core, barcode] = await Promise.all([
        import('@scandit/web-datacapture-core'),
        import('@scandit/web-datacapture-barcode'),
      ])
      await core.DataCaptureContext.forLicenseKey(LICENSE_KEY, {
        libraryLocation: LIBRARY_LOCATION,
        moduleLoaders: [barcode.barcodeCaptureLoader()],
      })
      return { core, barcode }
    })()
  }
  return contextPromise
}

/**
 * Start a full-screen MatrixScan AR session in `container`. Tracks every barcode
 * in view; draws a green highlight + info card on items the matcher says are on
 * the wishlist and nothing on non-matches. `getMatcher` is invoked per barcode
 * so the providers always read the current wishlist (no view rebuild needed when
 * the list changes). Resolves to a cleanup function.
 */
export async function startShelfScan(
  container: HTMLElement,
  getMatcher: () => ShelfMatcher,
): Promise<ShelfScanCleanup> {
  const { core, barcode } = await ensureContext()
  const { DataCaptureContext, Brush, Color } = core
  const {
    BarcodeAr,
    BarcodeArSettings,
    BarcodeArView,
    BarcodeArRectangleHighlight,
    BarcodeArInfoAnnotation,
    BarcodeArInfoAnnotationBodyComponent,
    BarcodeArAnnotationTrigger,
    Symbology,
  } = barcode

  const settings = new BarcodeArSettings()
  settings.enableSymbologies([
    Symbology.EAN13UPCA,
    Symbology.EAN8,
    Symbology.UPCE,
    Symbology.Code128,
    Symbology.QR,
  ])

  const barcodeAr = await BarcodeAr.forContext(
    DataCaptureContext.sharedInstance,
    settings,
  )

  const view: BarcodeArViewInstance = await BarcodeArView.create(
    container,
    DataCaptureContext.sharedInstance,
    barcodeAr,
  )

  // Translucent green fill + forest stroke for wishlist matches.
  const matchBrush = new Brush(
    Color.fromHex('#40916C').withAlpha(0.25),
    Color.fromHex('#2D6A4F'),
    3,
  )

  // Highlight only the matches; non-matches get no overlay (neutral / hidden).
  view.highlightProvider = {
    async highlightForBarcode(scanned, callback) {
      const data = scanned.data
      if (!data || !getMatcher().isMatch(data)) {
        showNothing(callback)
        return
      }
      const highlight = BarcodeArRectangleHighlight.create(scanned)
      highlight.brush = matchBrush
      callback(highlight)
    },
  }

  // A small "on your list" card on matches, naming the product.
  view.annotationProvider = {
    async annotationForBarcode(scanned, callback) {
      const data = scanned.data
      if (!data) {
        showNothing(callback)
        return
      }
      const matcher = getMatcher()
      if (!matcher.isMatch(data)) {
        showNothing(callback)
        return
      }
      const body = BarcodeArInfoAnnotationBodyComponent.create()
      body.text = `✓ ${matcher.labelFor(data) ?? 'On your list'}`
      const annotation = BarcodeArInfoAnnotation.create(scanned)
      annotation.body = [body]
      annotation.annotationTrigger = BarcodeArAnnotationTrigger.BarcodeScan
      callback(annotation)
    },
  }

  await view.start()

  return async function cleanup() {
    await view.stop()
    view.remove()
  }
}
