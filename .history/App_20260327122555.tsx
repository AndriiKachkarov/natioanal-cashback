import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { CASHBACK_PRODUCT_BARCODES } from './src/data/cashbackBarcodes';

type ScanResult = {
  code: string;
  isEligible: boolean;
};

const RESULT_VISIBLE_MS = 1200;
const DUPLICATE_GUARD_MS = 900;

function normalizeBarcode(rawCode: string): string {
  return rawCode.trim();
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanLocked, setIsScanLocked] = useState(false);

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanRef = useRef<{ code: string; timestamp: number } | null>(null);

  const cashbackBarcodes = useMemo(
    () => new Set(CASHBACK_PRODUCT_BARCODES.map(normalizeBarcode)),
    []
  );

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) {
      return;
    }

    requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    const normalizedCode = normalizeBarcode(data ?? '');

    if (!normalizedCode || isScanLocked) {
      return;
    }

    const now = Date.now();
    const lastScan = lastScanRef.current;

    if (
      lastScan &&
      lastScan.code === normalizedCode &&
      now - lastScan.timestamp < DUPLICATE_GUARD_MS
    ) {
      return;
    }

    lastScanRef.current = { code: normalizedCode, timestamp: now };
    setIsScanLocked(true);

    setScanResult({
      code: normalizedCode,
      isEligible: cashbackBarcodes.has(normalizedCode),
    });

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setIsScanLocked(false);
      setScanResult(null);
    }, RESULT_VISIBLE_MS);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar style="light" />
        <Text style={styles.permissionText}>Підготовка камери...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar style="light" />
        <Text style={styles.permissionText}>Потрібен доступ до камери для сканування штрихкоду.</Text>
        <Text style={styles.permissionHint}>
          Якщо запит не з&apos;явився, дозволь камеру в налаштуваннях додатка.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
        onBarcodeScanned={onBarcodeScanned}
      />

      <SafeAreaView pointerEvents="none" style={styles.overlay}>
        <Text style={styles.headerText}>Наведіть камеру на штрихкод</Text>

        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame} />
        </View>

        <View
          style={[
            styles.resultBanner,
            scanResult
              ? scanResult.isEligible
                ? styles.resultEligible
                : styles.resultNotEligible
              : styles.resultIdle,
          ]}
        >
          {scanResult ? (
            <>
              <Text style={styles.resultTitle}>
                {scanResult.isEligible
                  ? 'Є у програмі кешбеку'
                  : 'Немає у програмі кешбеку'}
              </Text>
              <Text style={styles.resultCode}>{scanResult.code}</Text>
            </>
          ) : (
            <Text style={styles.resultTitle}>Готово до сканування...</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    color: '#f8fafc',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
  permissionHint: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 21,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerText: {
    alignSelf: 'center',
    color: '#f8fafc',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  scanFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: '88%',
    maxWidth: 340,
    aspectRatio: 1.7,
    borderRadius: 18,
    borderColor: '#f8fafc',
    borderWidth: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
  },
  resultBanner: {
    minHeight: 84,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    borderWidth: 1,
  },
  resultIdle: {
    borderColor: 'rgba(148, 163, 184, 0.5)',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  resultEligible: {
    borderColor: 'rgba(134, 239, 172, 0.7)',
    backgroundColor: 'rgba(22, 101, 52, 0.86)',
  },
  resultNotEligible: {
    borderColor: 'rgba(254, 202, 202, 0.7)',
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
  },
  resultTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  resultCode: {
    color: '#e2e8f0',
    fontSize: 14,
    marginTop: 4,
  },
});
