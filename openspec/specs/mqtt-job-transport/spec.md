# mqtt-job-transport Specification

## Purpose

Deliver test messages from a browser to a recipient ESP32 over managed MQTT without a printer attached.

## Requirements

### Requirement: Browser-to-device delivery

The localhost test page SHALL publish a fixed payload with a fresh ID per send, using non-retained QoS 1 over WSS. The ESP32 SHALL connect over MQTT/TLS and log the received ID and payload. The page SHALL report broker acknowledgment without claiming device receipt.

#### Scenario: Live delivery across networks

- **WHEN** the browser publishes from a different network while the ESP32 is online
- **THEN** the page shows the broker acknowledgment and the ESP32 logs the matching ID and payload

### Requirement: Receiver session recovery

The ESP32 SHALL use a stable client ID across reconnects and reboots. It SHALL resume an existing MQTT session without resubscribing. If no session exists, it SHALL log that fact and subscribe to the test inbox.

#### Scenario: Wi-Fi interruption

- **WHEN** the browser publishes after the subscribed ESP32 loses Wi-Fi while still powered
- **THEN** restoring Wi-Fi resumes the session without resubscribing and the ESP32 logs the queued message's ID and payload

#### Scenario: Power cycle

- **WHEN** the browser publishes after the subscribed ESP32 is powered off
- **THEN** powering it back on resumes the session without resubscribing and the ESP32 logs the queued message's ID and payload

#### Scenario: Session absent

- **WHEN** the ESP32 connects and the broker reports no existing session
- **THEN** the ESP32 logs the missing session, subscribes, and receives a new live test message
