import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { KnockZone } from './useKnockPattern';

type BluetoothDevice = {
  address: string;
  name?: string;
  connected?: boolean;
  write?: (data: string) => Promise<void>;
  cancelConnection?: () => Promise<void>;
  connect?: (options?: Record<string, unknown>) => Promise<void>;
  onDataReceived?: (
    listener: (event: { data: string; timestamp?: number }) => void
  ) => { remove: () => void };
};

// Delimiter and command payloads can be adjusted once the STM32 firmware is finalized.
const MESSAGE_DELIMITER = '\n';
const HC05_NAME = 'HC-05';
const UNLOCK_PAYLOAD = 'UNLOCK';

const bluetooth = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-bluetooth-classic');
    return mod?.default ?? mod;
  } catch (error) {
    console.warn(
      'react-native-bluetooth-classic is not installed. Live HC-05 integration will be disabled until it is added.'
    );
    return null;
  }
})();

function parseZone(raw: string): KnockZone | undefined {
  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith('l') || normalized === '1') return 'L';
  if (normalized.startsWith('r') || normalized === '2') return 'R';
  return undefined;
}

export function useHc05Bluetooth(onKnock: (zone: KnockZone) => void) {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const connect = useCallback(async () => {
    if (!bluetooth) {
      setError('Bluetooth bridge missing: install react-native-bluetooth-classic and rebuild.');
      return;
    }
    if (typeof bluetooth.getBondedDevices !== 'function') {
      setError('Bluetooth API missing: expected getBondedDevices from react-native-bluetooth-classic.');
      return;
    }
    setIsConnecting(true);
    setError(null);

    try {
      const bonded = await bluetooth.getBondedDevices();
      const target =
        bonded?.find?.((entry: BluetoothDevice) => entry.name === HC05_NAME) ?? bonded?.[0];

      if (!target) {
        throw new Error('No bonded HC-05 found. Pair it in system settings first.');
      }

      let connected: BluetoothDevice = target;

      if (typeof bluetooth.connectToDevice === 'function') {
        connected =
          (await bluetooth.connectToDevice(target.address, {
            delimiter: MESSAGE_DELIMITER,
          })) ?? target;
      } else if (typeof target.connect === 'function') {
        await target.connect({ delimiter: MESSAGE_DELIMITER });
        connected = target;
      }

      setDevice(connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to HC-05');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!bluetooth || !device) return;
    try {
      await device.cancelConnection?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disconnect');
    } finally {
      setDevice(null);
    }
  }, [device]);

  const sendUnlockSignal = useCallback(
    async (codeName: string) => {
      if (!bluetooth || !device?.write) {
        setError('Connect to HC-05 before sending unlock commands.');
        return;
      }

      try {
        await device.write(`${UNLOCK_PAYLOAD}:${codeName}${MESSAGE_DELIMITER}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to send unlock signal');
      }
    },
    [device]
  );

  useEffect(() => {
    if (!bluetooth || !device?.onDataReceived) return;
    const sub = device.onDataReceived((payload: { data: string }) => {
      setLastMessage(payload.data);
      const zone = parseZone(payload.data);
      if (zone) {
        onKnock(zone);
      }
    });

    const disconnectSub = bluetooth.onDeviceDisconnected?.(() => setDevice(null));

    return () => {
      sub?.remove?.();
      disconnectSub?.remove?.();
    };
  }, [device, onKnock]);

  useEffect(() => {
    if (!bluetooth) return;
    const handleChange = (nextAppState: AppStateStatus) => {
      const previous = appState.current;
      appState.current = nextAppState;
      if (previous.match(/active/) && nextAppState.match(/inactive|background/)) {
        disconnect();
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected: !!device,
    isConnecting,
    error,
    lastMessage,
    deviceName: device?.name ?? HC05_NAME,
    sendUnlockSignal,
  };
}
