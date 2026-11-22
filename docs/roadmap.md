# Roadmap

The milestones below describe what to deliver and how to verify it. Use OpenSpec to define the requirements and implementation tasks for each change. The [product contract](product.md) defines the scope, and the [design register](unresolved.md) tracks decisions that are still open.

## 1. Choose the managed MQTT broker

1. [x] **Shortlist providers and plans.** Compare browser WSS, device TLS, topic permissions, retained records, offline queues, payload limits, and cost.
2. [ ] **Test the finalists with generic clients.** Verify browser and device connections, queued delivery after reconnect, and that a restricted browser credential cannot read another member's inbox or write authoritative key records.
3. [ ] **Select the provider and plan.** Record verified behavior, plan limits, and any unverified guarantees before building either tinyfax MQTT client.

## 2. Send real messages without paper

1. [x] **Build the browser-to-ESP32 test path.** Send a fixed payload through the selected broker. Verify online and offline delivery and distinguish broker acknowledgment from device receipt.
2. [ ] **Build secure job acceptance.** Define topic permissions, the member and key directory, and the signed, encrypted job format. Provision test identities by hand. Verify that the receiver rejects invalid and unauthorized jobs and does not accept a duplicate after reboot.
3. [ ] **Deploy the sender.** Add recipient selection, browser credential storage, text and image composition, raster preview, and send feedback. Send both text and an image to a remote ESP32 with the sender's ESP32 off. The receiver records the accepted raster without a printer attached.

## 3. Make the appliance work with the P21

Start after the paper-free sender demo and once the breakout boards arrive.

1. [ ] **Rewrite the P21 integration for ESP32.** Connect the job receiver to a driver that consumes validated raster data. Verify physical output, paper-free keepalive, and USB reconnection.
2. [ ] **Handle interrupted prints.** Test printer unavailability, USB disconnect during a job, and reboot around USB submission. Define what happens when the device cannot tell whether a job printed. Keep routine messaging tests paper-free.
3. [ ] **Validate the permanent assembly.** Check power and charging behavior, enclosure fit, and recovery after power cycling. Verify that the owner can reliably reach local setup and that boot and idle operation use no paper.

## 4. Prepare and run the two-household pilot

The first three steps can start after milestone 2 without the breakout boards. Complete the final checks on assembled units.

1. [ ] **Make membership and browser setup repeatable.** Give the administrator a provisioning workflow that adds members without redeploying clients. Let owners enroll, replace, and revoke browsers through their printer, even after losing all browser data.
2. [ ] **Make local recovery usable.** Provide authenticated local setup and a recovery AP. Verify that owners can change Wi-Fi, block senders, and diagnose connectivity without administrator help.
3. [ ] **Make firmware updates safe.** Confirm that the integrated firmware fits the target board. Verify signed OTA and rollback that preserve identity and settings. Restrict remote maintenance to authorized actions.
4. [ ] **Hand off two units.** Have both households send text and images with their own printers off. Exercise offline recipient delivery within broker limits, and have owners try browser and Wi-Fi recovery without developer help.
