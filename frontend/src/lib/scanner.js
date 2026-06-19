// Scandit SparkScan (Web) integration.
//
// SparkScan is the pre-built, high-speed single-scanning UI from the Scandit
// Data Capture SDK — it overlays a trigger button on the current screen. It
// needs a license key (https://ssl.scandit.com); when none is configured the
// app falls back to manual barcode entry, so the recommend flow still works.

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY

// Pin the wasm/engine to the installed SDK major version.
const LIBRARY_LOCATION =
  'https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/'

export function scannerAvailable() {
  return Boolean(LICENSE_KEY)
}

/**
 * Start SparkScan inside `container`. Calls `onScan(barcodeData)` for each
 * recognised barcode. Resolves to a cleanup function that tears the scanner
 * down. The heavy SDK is imported lazily so it never weighs down initial load.
 */
export async function startSparkScan(container, onScan) {
  if (!LICENSE_KEY) {
    throw new Error('No Scandit license key set (VITE_SCANDIT_LICENSE_KEY).')
  }

  const [core, barcode] = await Promise.all([
    import('@scandit/web-datacapture-core'),
    import('@scandit/web-datacapture-barcode'),
  ])
  const { DataCaptureContext } = core
  const {
    barcodeCaptureLoader,
    SparkScan,
    SparkScanSettings,
    SparkScanView,
    SparkScanViewSettings,
    Symbology,
  } = barcode

  await DataCaptureContext.forLicenseKey(LICENSE_KEY, {
    libraryLocation: LIBRARY_LOCATION,
    moduleLoaders: [barcodeCaptureLoader()],
  })

  const settings = new SparkScanSettings()
  // Retail product barcodes are EAN-13/UPC-A; keep the set tight for speed.
  settings.enableSymbologies([
    Symbology.EAN13UPCA,
    Symbology.EAN8,
    Symbology.UPCE,
    Symbology.Code128,
  ])

  const sparkScan = SparkScan.forSettings(settings)
  const listener = {
    didScan: (_sparkScan, session) => {
      const code = session.newlyRecognizedBarcode?.data
      if (code) onScan(code)
    },
  }
  sparkScan.addListener(listener)

  const view = SparkScanView.forElement(
    container,
    DataCaptureContext.sharedInstance,
    sparkScan,
    new SparkScanViewSettings(),
  )
  await view.prepareScanning()

  return async function cleanup() {
    sparkScan.removeListener(listener)
    await view.stopScanning()
  }
}
