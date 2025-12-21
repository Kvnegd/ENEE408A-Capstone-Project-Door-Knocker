import { Audio } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHc05Bluetooth } from '@/hooks/useHc05Bluetooth';
import { KnockZone, ValidCodes, useKnockPattern } from '@/hooks/useKnockPattern';

type LogEntry = {
  message: string;
  id: number;
  timestamp: number;
};

function KnockWave({ trigger, align }: { trigger: number; align: 'flex-start' | 'flex-end' }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const prev = useRef(trigger);

  useEffect(() => {
    if (trigger === prev.current) return;
    prev.current = trigger;
    scale.setValue(0);
    opacity.setValue(0.9);
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [trigger, opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wave,
        { alignSelf: align },
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

function KnockBadge({ zone, isActive }: { zone?: KnockZone; isActive: boolean }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const label = zone === 'L' ? 'Left' : zone === 'R' ? 'Right' : '...';

  const { backgroundColor, borderColor, textColor } = useMemo(() => {
    if (!isActive || !zone) {
      return {
        backgroundColor: isDark ? '#1f2530' : '#f4f4f4',
        borderColor: isDark ? '#2b3543' : '#d9d9d9',
        textColor: isDark ? '#eef1f6' : '#11181C',
      };
    }
    if (zone === 'L') {
      return {
        backgroundColor: isDark ? '#1f3b5e' : '#d8ecff',
        borderColor: isDark ? '#2b5a8a' : '#7cc8ff',
        textColor: isDark ? '#d8e7ff' : '#0b3a66',
      };
    }
    return {
      backgroundColor: isDark ? '#5a3125' : '#ffe1d6',
      borderColor: isDark ? '#8a4a35' : '#d48f6a',
      textColor: isDark ? '#ffe3d8' : '#4a1e10',
    };
  }, [isActive, isDark, zone]);

  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <ThemedText style={[styles.badgeText, { color: textColor }]}>{label}</ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastKnock, setLastKnock] = useState<{ zone: KnockZone; tick: number } | null>(null);
  const [leftTick, setLeftTick] = useState(0);
  const [rightTick, setRightTick] = useState(0);
  const doorPulse = useRef(new Animated.Value(0)).current;
  const doorTilt = useRef(new Animated.Value(0)).current;
  const knockSound = useRef<Audio.Sound | null>(null);
  const logId = useRef(0);

  const KNOCK_SOUND_URL = 'https://actions.google.com/sounds/v1/impacts/wood_plank_flicks.ogg';

  useEffect(() => {
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: KNOCK_SOUND_URL });
        knockSound.current = sound;
      } catch {
        // ignore sound load failure
      }
    })();
    return () => {
      knockSound.current?.unloadAsync?.();
    };
  }, []);

  const playKnockSound = useCallback(() => {
    knockSound.current?.replayAsync?.().catch(() => {});
  }, []);

  const { sequence, match, progress, registerKnock, reset } = useKnockPattern((code) => {
    sendUnlockSignal(code);
    setLog((entries) => {
      const nextId = logId.current + 1;
      logId.current = nextId;
      return [
        { id: nextId, message: `Valid code: ${code} — unlock sent`, timestamp: Date.now() },
        ...entries.slice(0, 4),
      ];
    });
  });

  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    deviceName,
    error,
    lastMessage,
    sendUnlockSignal,
  } = useHc05Bluetooth((zone) => {
    registerKnock(zone, 'bluetooth');
    const tick = Date.now();
    setLastKnock({ zone, tick });
    if (zone === 'L') setLeftTick((t) => t + 1);
    if (zone === 'R') setRightTick((t) => t + 1);
    playKnockSound();
    setLog((entries) => {
      const nextId = logId.current + 1;
      logId.current = nextId;
      return [
        { id: nextId, message: `HC-05 knock: ${zone === 'L' ? 'Left' : 'Right'}`, timestamp: Date.now() },
        ...entries.slice(0, 8),
      ];
    });
  });

  const handleSimulatedKnock = (zone: KnockZone) => {
    registerKnock(zone, 'simulated');
    const tick = Date.now();
    setLastKnock({ zone, tick });
    if (zone === 'L') setLeftTick((t) => t + 1);
    if (zone === 'R') setRightTick((t) => t + 1);
    playKnockSound();
    setLog((entries) => {
      const nextId = logId.current + 1;
      logId.current = nextId;
      return [
        { id: nextId, message: `Simulated knock: ${zone === 'L' ? 'Left' : 'Right'}`, timestamp: Date.now() },
        ...entries.slice(0, 8),
      ];
    });
  };

  const matchLabel = useMemo(() => {
    if (match.status === 'matched') return `${match.codeName.toUpperCase()} unlocked`;
    if (match.status === 'invalid') return 'Invalid pattern — start again';
    return 'Listening for 4 knocks';
  }, [match]);

  useEffect(() => {
    if (!lastKnock) return;
    doorPulse.setValue(0);
    Animated.sequence([
      Animated.timing(doorPulse, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(doorPulse, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();

    const direction = lastKnock.zone === 'L' ? -1 : 1;
    doorTilt.setValue(0);
    Animated.sequence([
      Animated.timing(doorTilt, { toValue: 8 * direction, duration: 120, useNativeDriver: true }),
      Animated.spring(doorTilt, {
        toValue: 0,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [doorPulse, lastKnock, doorTilt]);

  const resetSequence = () => {
    reset();
    setLog((entries) => {
      const nextId = logId.current + 1;
      logId.current = nextId;
      return [
        { id: nextId, message: 'Sequence reset', timestamp: Date.now() },
        ...entries.slice(0, 8),
      ];
    });
  };

  return (
    <ThemedView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.row}>
          <ThemedText type="title" style={styles.heroTitle}>
            DoorKnocker
          </ThemedText>
          <View
            style={[
              styles.pill,
              isConnected ? styles.pillConnectedLight : styles.pillIdleLight,
              isDark && (isConnected ? styles.pillConnectedDark : styles.pillIdleDark),
            ]}>
            <ThemedText style={styles.pillText}>
              {isConnected ? 'HC-05 Connected' : 'Not Connected'}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.subtitle}>
          Knock four times on either side. Kevin and Danny codes unlock the door.
        </ThemedText>

        <ThemedView style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Live door
              </ThemedText>
              <ThemedText style={styles.muted} numberOfLines={2}>
                {matchLabel} • {Math.round(progress * 4)}/4 knocks
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.actionButton,
                styles.actionButtonSmall,
                styles.resetButtonLight,
                isDark && styles.resetButtonDark,
              ]}
              onPress={resetSequence}
              accessibilityRole="button">
              <ThemedText style={styles.actionLabel}>Reset</ThemedText>
            </Pressable>
          </View>

          <Animated.View
            style={[
              styles.doorShell,
              {
                transform: [
                  {
                    translateX: doorTilt.interpolate({
                      inputRange: [-12, 12],
                      outputRange: [-10, 10],
                    }),
                  },
                  {
                    rotate: doorTilt.interpolate({
                      inputRange: [-12, 12],
                      outputRange: ['-6deg', '6deg'],
                    }),
                  },
                  {
                    scale: doorPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.08],
                    }),
                  },
                ],
                shadowOpacity: doorPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.18, 0.34],
                }),
              },
            ]}>
            <KnockWave trigger={leftTick} align="flex-start" />
            <View style={styles.door}>
              <View style={styles.doorLeft} />
              <View style={styles.doorRight} />
              <View style={styles.knob} />
            </View>
            <KnockWave trigger={rightTick} align="flex-end" />
          </Animated.View>

          <View style={styles.sequenceRow}>
            {new Array(4).fill(null).map((_, idx) => (
              <KnockBadge key={idx} zone={sequence[idx]?.zone} isActive={Boolean(sequence[idx])} />
            ))}
          </View>

          <View style={styles.simControls}>
            <Pressable
              onPress={() => handleSimulatedKnock('L')}
              style={[
                styles.actionButton,
                styles.leftButtonLight,
                isDark && styles.leftButtonDark,
              ]}
              accessibilityRole="button">
              <ThemedText style={styles.actionLabel}>Left knock</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleSimulatedKnock('R')}
              style={[
                styles.actionButton,
                styles.rightButtonLight,
                isDark && styles.rightButtonDark,
              ]}
              accessibilityRole="button">
              <ThemedText style={styles.actionLabel}>Right knock</ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <ThemedView
          style={[styles.card, styles.cardTall, isDark ? styles.cardDark : styles.cardLight]}>
          <View style={styles.cardHeader}>
            <View>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                HC-05 link
              </ThemedText>
              <ThemedText style={styles.muted}>{deviceName}</ThemedText>
            </View>
            {isConnected ? (
              <Pressable
                style={[
                  styles.actionButton,
                  styles.actionButtonSmall,
                  styles.disconnectLight,
                  isDark && styles.disconnectDark,
                ]}
                onPress={disconnect}
                accessibilityRole="button">
                <ThemedText style={styles.actionLabel}>Disconnect</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.actionButton,
                  styles.actionButtonSmall,
                  styles.connectLight,
                  isDark && styles.connectDark,
                ]}
                onPress={connect}
                disabled={isConnecting}
                accessibilityRole="button">
                <ThemedText style={styles.actionLabel}>
                  {isConnecting ? 'Connecting…' : 'Connect'}
                </ThemedText>
              </Pressable>
            )}
          </View>
          <ThemedText style={styles.muted}>
            Pair the HC-05 in system settings first. Incoming messages are parsed as left (1/L) or
            right (2/R) knocks.
          </ThemedText>
          {lastMessage && (
            <View style={styles.rowSpread}>
              <ThemedText style={styles.muted}>Last message</ThemedText>
              <ThemedText>{lastMessage.trim()}</ThemedText>
            </View>
          )}
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        </ThemedView>

        <ThemedView
          style={[styles.card, styles.cardTall, isDark ? styles.cardDark : styles.cardLight]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Valid codes
          </ThemedText>
          <View style={styles.patternRow}>
            {Object.entries(ValidCodes).map(([name, pattern]) => (
              <View
                key={name}
                style={[
                  styles.patternCard,
                  isDark ? styles.patternCardDark : styles.patternCardLight,
                ]}>
                <ThemedText style={styles.patternTitle}>{name.toUpperCase()}</ThemedText>
                <View style={styles.sequenceRow}>
                  {pattern.map((zone, idx) => (
                    <KnockBadge key={`${name}-${idx}`} zone={zone} isActive />
                  ))}
                </View>
              </View>
            ))}
          </View>
          <ThemedText style={styles.muted}>
            Adjust the payload in `hooks/useHc05Bluetooth.ts` once the STM32 unlock command is set.
          </ThemedText>
        </ThemedView>

        <ThemedView
          style={[styles.card, styles.cardTall, isDark ? styles.cardDark : styles.cardLight]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent events
          </ThemedText>
          {log.map((entry) => (
            <View key={entry.id} style={styles.logRow}>
              <ThemedText style={styles.muted}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </ThemedText>
              <ThemedText>{entry.message}</ThemedText>
            </View>
          ))}
          {log.length === 0 && (
            <ThemedText style={styles.muted}>Knock or simulate to see activity.</ThemedText>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 52,
  },
  container: {
    gap: 16,
    paddingBottom: 64,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowSpread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  subtitle: {
    opacity: 0.7,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTall: {
    paddingVertical: 24,
    minHeight: 190,
  },
  cardLight: {
    backgroundColor: '#ffffff',
  },
  cardDark: {
    backgroundColor: '#181d26',
    borderWidth: 1,
    borderColor: '#222a36',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillConnectedLight: {
    backgroundColor: '#c0f0d7',
  },
  pillConnectedDark: {
    backgroundColor: '#1f3b2d',
  },
  pillIdleLight: {
    backgroundColor: '#f3d7d7',
  },
  pillIdleDark: {
    backgroundColor: '#3d2b2b',
  },
  pillText: {
    fontWeight: '600',
  },
  doorShell: {
    backgroundColor: '#1c1f23',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  door: {
    height: 240,
    borderRadius: 12,
    backgroundColor: '#d7d2c5',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  doorLeft: {
    flex: 1,
    backgroundColor: '#e7e3d6',
    borderRightWidth: 2,
    borderColor: '#c1b9a3',
  },
  doorRight: {
    flex: 1,
    backgroundColor: '#d2cbb7',
  },
  knob: {
    position: 'absolute',
    right: 24,
    top: '48%',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8f8060',
    borderWidth: 3,
    borderColor: '#c7bca5',
  },
  wave: {
    position: 'absolute',
    top: '50%',
    marginTop: -55,
    width: 140,
    height: 140,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: '#7cc8ff',
    backgroundColor: 'rgba(124,200,255,0.22)',
  },
  sequenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: '700',
  },
  simControls: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonSmall: {
    flex: 0,
    minWidth: 92,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  actionLabel: {
    fontWeight: '600',
  },
  resetButtonLight: {
    backgroundColor: '#efefef',
  },
  resetButtonDark: {
    backgroundColor: '#2b313d',
  },
  leftButtonLight: {
    backgroundColor: '#d8ecff',
  },
  leftButtonDark: {
    backgroundColor: '#1f3b5e',
  },
  rightButtonLight: {
    backgroundColor: '#ffe1d6',
  },
  rightButtonDark: {
    backgroundColor: '#5a3125',
  },
  connectLight: {
    backgroundColor: '#d8ecff',
  },
  connectDark: {
    backgroundColor: '#1f3b5e',
  },
  disconnectLight: {
    backgroundColor: '#ffe1d6',
  },
  disconnectDark: {
    backgroundColor: '#5a3125',
  },
  patternRow: {
    gap: 16,
  },
  patternCard: {
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  patternCardLight: {
    backgroundColor: '#f4f6fa',
  },
  patternCardDark: {
    backgroundColor: '#222a36',
  },
  patternTitle: {
    fontWeight: '700',
  },
  muted: {
    opacity: 0.7,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  error: {
    color: '#b00020',
    marginTop: 6,
  },
});
