import type {
  BarcodeCapture as BarcodeCaptureInstance,
  BarcodeCaptureListener,
  BarcodeCaptureSession,
} from '@scandit/web-datacapture-barcode'
import type { DataCaptureView as DataCaptureViewInstance } from '@scandit/web-datacapture-core'

// Scandit BarcodeCapture (Web) integration.
//
// BarcodeCapture is the SDK's low-level single-barcode scanning mode: a
// full-screen camera preview with a highlight overlay (no pre-built widget).
// It is wired up by hand following the scandit/skills `barcode-capture-web`
// guide. The heavy SDK + WASM engine is imported lazily so it never weighs
// down initial page load.
//
// Requires VITE_SCANDIT_LICENSE_KEY (from the hackathon organizers; generate
// at https://ssl.scandit.com). The camera needs a secure context — localhost
// during development or HTTPS in production.

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY as string | undefined

// Pin the wasm/engine to the installed SDK major version (CDN-hosted).
const LIBRARY_LOCATION =
  'https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/'

/** Thrown when no Scandit license key is configured. Mirrors MissingApiKeyError. */
export class MissingScanditKeyError extends Error {
  constructor() {
    super(
      'No Scandit license key found. Copy .env.example to .env and set ' +
        'VITE_SCANDIT_LICENSE_KEY (from the hackathon organizers), then restart ' +
        'the dev server.',
    )
    this.name = 'MissingScanditKeyError'
  }
}

/** True when a license key is configured — gates the camera UI. */
export function scannerConfigured(): boolean {
  return Boolean(LICENSE_KEY)
}

export type ScanCleanup = () => Promise<void>

// Lazily-loaded SDK namespaces, populated once by initScandit().
type CoreModule = typeof import('@scandit/web-datacapture-core')
type BarcodeModule = typeof import('@scandit/web-datacapture-barcode')
let core: CoreModule | null = null
let barcode: BarcodeModule | null = null

// One-time context/camera/mode setup, memoised so initScandit() is idempotent.
let initPromise: Promise<void> | null = null
let barcodeCapture: BarcodeCaptureInstance | null = null

/**
 * Initialise the Scandit data capture context, camera, and BarcodeCapture mode
 * exactly once. Subsequent calls return the same settled/in-flight promise.
 * Rejects with MissingScanditKeyError when no license key is configured.
 */
export function initScandit(): Promise<void> {
  if (!LICENSE_KEY) return Promise.reject(new MissingScanditKeyError())
  if (!initPromise) initPromise = doInit(LICENSE_KEY)
  return initPromise
}

async function doInit(licenseKey: string): Promise<void> {
  ;[core, barcode] = await Promise.all([
    import('@scandit/web-datacapture-core'),
    import('@scandit/web-datacapture-barcode'),
  ])

  const { DataCaptureContext, Camera } = core
  const { barcodeCaptureLoader, BarcodeCapture, BarcodeCaptureSettings, Symbology } =
    barcode

  await DataCaptureContext.forLicenseKey(licenseKey, {
    libraryLocation: LIBRARY_LOCATION,
    moduleLoaders: [barcodeCaptureLoader()],
  })

  const settings = new BarcodeCaptureSettings()
  // The demo-book SKUs use EAN-13/UPC (retail), QR (shoes) and Code128 (socks
  // and tops); EAN8/UPCE round out common retail codes. Keep the set tight —
  // fewer symbologies means faster, more accurate scanning.
  settings.enableSymbologies([
    Symbology.EAN13UPCA,
    Symbology.EAN8,
    Symbology.UPCE,
    Symbology.Code128,
    Symbology.QR,
  ])
  // Don't re-fire on the same code repeatedly while the camera is up.
  settings.codeDuplicateFilter = 1000

  const camera = Camera.pickBestGuess()
  if (!camera) {
    throw new Error('No camera is available on this device.')
  }
  await camera.applySettings(BarcodeCapture.recommendedCameraSettings)
  await DataCaptureContext.sharedInstance.setFrameSource(camera)

  barcodeCapture = await BarcodeCapture.forContext(
    DataCaptureContext.sharedInstance,
    settings,
  )
  // Stay disabled until a scan session actually starts.
  await barcodeCapture.setEnabled(false)
}

/**
 * Start a full-screen scan session inside `container`. Invokes `onScan(data)`
 * for the first recognised barcode and then disables the mode (the caller
 * typically tears the view down on a successful scan). Resolves to a cleanup
 * function that stops the camera and detaches the preview.
 *
 * `container` must be a positioned element with non-zero dimensions, or the
 * camera preview will not render.
 */
export async function startScan(
  container: HTMLElement,
  onScan: (code: string) => void,
): Promise<ScanCleanup> {
  await initScandit()
  if (!core || !barcode || !barcodeCapture) {
    throw new Error('Scandit failed to initialise.')
  }

  const { DataCaptureContext, DataCaptureView, FrameSourceState } = core
  const { BarcodeCaptureOverlay } = barcode
  const mode = barcodeCapture

  const view: DataCaptureViewInstance = await DataCaptureView.forContext(
    DataCaptureContext.sharedInstance,
  )
  view.connectToElement(container)
  await BarcodeCaptureOverlay.withBarcodeCaptureForView(mode, view)

  const listener: BarcodeCaptureListener = {
    didScan: async (bc: BarcodeCaptureInstance, session: BarcodeCaptureSession) => {
      const recognised = session.newlyRecognizedBarcode
      if (!recognised) return
      // Disable immediately to prevent duplicate scans while we hand off.
      await bc.setEnabled(false)
      const data = recognised.data
      if (data) onScan(data)
    },
  }
  mode.addListener(listener)

  await mode.setEnabled(true)
  await DataCaptureContext.sharedInstance.frameSource?.switchToDesiredState(
    FrameSourceState.On,
  )

  return async function cleanup() {
    mode.removeListener(listener)
    await mode.setEnabled(false)
    await DataCaptureContext.sharedInstance.frameSource?.switchToDesiredState(
      FrameSourceState.Off,
    )
    view.detachFromElement()
  }
}
