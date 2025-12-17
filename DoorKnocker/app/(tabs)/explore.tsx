import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ValidCodes } from '@/hooks/useKnockPattern';

export default function TabTwoScreen() {
  return (
    <ThemedView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">Setup & Notes</ThemedText>
        <ThemedText style={styles.lead}>
          Pair the HC-05, stream knocks (L/R), and send the unlock payload when a valid 4-knock code
          arrives.
        </ThemedText>

        <Collapsible title="Pairing steps">
          <ThemedText>1) Power the STM32 + HC-05 and ensure it is discoverable.</ThemedText>
          <ThemedText>2) Pair the HC-05 in the phone's Bluetooth settings first.</ThemedText>
          <ThemedText>
            3) Open the Live tab and tap Connect. Incoming UART lines are parsed into left/right
            knocks.
          </ThemedText>
        </Collapsible>

        <Collapsible title="Message contract">
          <ThemedText>
            The app expects one character per knock, starting with <ThemedText type="defaultSemiBold">L</ThemedText> or{' '}
            <ThemedText type="defaultSemiBold">R</ThemedText>, newline-terminated.
          </ThemedText>
          <ThemedText>
            Update `parseZone` or the delimiter in <ThemedText type="defaultSemiBold">hooks/useHc05Bluetooth.ts</ThemedText> if the
            firmware sends a different shape.
          </ThemedText>
        </Collapsible>

        <Collapsible title="Unlock payload">
          <ThemedText>
            The app currently writes <ThemedText type="defaultSemiBold">UNLOCK:&lt;codeName&gt;\n</ThemedText> when a valid pattern is
            received. Adjust <ThemedText type="defaultSemiBold">UNLOCK_PAYLOAD</ThemedText> or the formatter once the STM32 command set
            is finalized.
          </ThemedText>
        </Collapsible>

        <Collapsible title="Valid combinations">
          <View style={styles.patterns}>
            {Object.entries(ValidCodes).map(([name, pattern]) => (
              <View key={name} style={styles.patternCard}>
                <ThemedText type="subtitle">{name.toUpperCase()}</ThemedText>
                <ThemedText>{pattern.join(' - ')}</ThemedText>
              </View>
            ))}
          </View>
        </Collapsible>

        <Collapsible title="Expo Bluetooth dev build">
          <ThemedText>
            HC-05 uses classic Bluetooth (SPP). Add <ThemedText type="defaultSemiBold">react-native-bluetooth-classic</ThemedText> with
            an Expo config plugin and build a custom dev client to run on device.
          </ThemedText>
          <ThemedText
            style={styles.link}
            onPress={() =>
              Linking.openURL('https://docs.expo.dev/develop/development-builds/create-a-build/')
            }>
            Expo dev build guide
          </ThemedText>
        </Collapsible>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 36,
  },
  container: {
    gap: 12,
    paddingBottom: 48,
  },
  lead: {
    opacity: 0.7,
  },
  patterns: {
    gap: 8,
  },
  patternCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    gap: 6,
  },
  link: {
    color: '#0a7ea4',
    marginTop: 8,
  },
});
