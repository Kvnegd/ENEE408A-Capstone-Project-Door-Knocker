# DoorKnocker

DoorKnocker is a smart door-knock access system that pairs embedded signal processing with a mobile app. The embedded node detects knocks, localizes which side of the door was hit, and classifies patterns. The app renders a live door view, confirms the knock sequence in real time, and sends an unlock command when a valid code is received.

## Project overview

This project implements an embedded "smart door knocker" system that detects, localizes, and classifies knocks on a door using piezoelectric sensors and a microcontroller-based signal-processing pipeline. Multiple sensors are sampled via synchronized ADC channels, and the resulting vibration signals are analyzed in real time to estimate knock amplitude and relative timing, enabling the system to determine which region of the door was struck and whether the knock pattern matches a predefined access sequence. The design emphasizes robust detection under noise, efficient fixed-point/embedded processing, and a modular firmware architecture that can be extended to drive actuators (e.g., an electronic lock) or integrate with higher-level access-control and logging systems.

## Mobile app

The app is built with Expo and React Native. It connects to an HC-05 Bluetooth module and translates incoming data into left/right knocks. Key features include:

- Live door visualization with directional ripple and knock animations.
- Knock sequence progress and feedback for valid or invalid patterns.
- Quick reset and simulated knocks for testing without hardware.
- Bluetooth connection management, status, and debug log view.
- Unlock command signaling when a valid pattern is detected.

Current patterns are four knocks long with two valid codes (Kevin and Danny). Patterns can be adjusted in `hooks/useKnockPattern.ts`.

## Communication flow

1) STM32 detects a knock and determines the door zone (left or right).
2) STM32 sends `1` (left) or `2` (right) over the HC-05.
3) The app parses the message, updates the door UI, and appends the knock to the sequence.
4) When a valid sequence is matched, the app sends an unlock payload back to the device.

## Local development

Install dependencies:

```bash
npm install
```

Start Metro:

```bash
npx expo start
```

Note: Classic Bluetooth requires a development build (Expo Go does not include native modules). Build a dev client or run a native build:

```bash
eas build --profile development --platform android
```

## Repository structure (high level)

- `app/` - Expo Router screens (Live and Setup tabs).
- `hooks/` - Knock pattern logic and Bluetooth interface.
- `components/` - UI building blocks.
- `assets/` - App images and static resources.

## Config notes

- Bluetooth parsing is implemented in `hooks/useHc05Bluetooth.ts`.
- Knock pattern matching is defined in `hooks/useKnockPattern.ts`.
- Unlock payload format can be changed in `hooks/useHc05Bluetooth.ts`.

## Future extensions

- Dynamic pattern enrollment from the app.
- User profiles, audit logs, and access history.
- Actuator control and safe fallback modes.
- On-device calibration for different door materials and sensor placements.
