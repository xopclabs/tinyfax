# tinyfax

Tinyfax connects members' browsers to recipients' printers.

## Language

**Test message**:
A diagnostic payload used to verify delivery to a recipient's device without printing.
_Avoid_: Print job

**Device receipt**:
The recipient's ESP32 received the message. This does not mean it accepted a print job or produced paper output.
_Avoid_: Broker acknowledgment, print confirmation

**Job acceptance**:
The recipient's ESP32 has validated a print job and recorded its identity for duplicate detection. It does not confirm paper output.
_Avoid_: Device receipt, print confirmation
