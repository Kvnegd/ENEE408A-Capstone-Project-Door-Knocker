#**Door Knocker** 

Smart Knock Detection & Mobile Control System

##**Overview**

Door Knocker is an embedded “smart door” system that detects, localizes, and classifies physical knocks using piezoelectric sensors and real-time signal processing. Instead of buttons or touch input, the system interprets vibration patterns on a door to determine where and how a knock occurred.

The project combines:

Embedded firmware for knock detection and localization

A mobile app for configuration, visualization, and interaction

Together, these components form a complete knock-based access and monitoring platform.

##**How It Works**

Piezoelectric sensors mounted on the door convert knocks into electrical signals

Synchronized ADC sampling captures vibration data from multiple sensors

Embedded signal processing extracts features such as amplitude and relative timing

Classification logic determines the knock location (zone) and pattern

Mobile app displays data and allows system configuration

The system is designed to be robust against noise and structural vibrations while remaining efficient enough for real-time embedded operation.

##**Features**
###**Embedded System**

Multi-sensor knock detection using piezo discs

Simultaneous ADC sampling for accurate comparison

Real-time amplitude and timing analysis

Zone-based knock localization

Modular firmware architecture for easy extension

###**Mobile Application**

Configure thresholds, sensitivity, and zones

Visualize knock activity and sensor responses

Manage knock patterns for access control

Monitor system status and recent events

Designed for future expansion (logging, notifications, actuator control)

##**Use Cases**

Knock-based access control systems

Smart doors without touch interfaces

Embedded signal-processing experimentation

Educational projects involving ADCs, sensors, and real-time DSP

##**Project Goals**

*Build a reliable knock detection and localization pipeline

*Integrate embedded firmware with a modern mobile UI

*Emphasize clean, modular, and extensible design

*Apply real-time signal processing in a practical system
