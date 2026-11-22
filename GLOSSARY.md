# tinyfax

Tinyfax connects members' browsers to recipients' printers.

## Language

**Test message**:
A diagnostic payload used to verify delivery to a recipient's device without printing.
_Avoid_: Print job

**Device receipt**:
The recipient's ESP32 received the message. This does not mean it accepted a print job or produced paper output.
_Avoid_: Broker acknowledgment, print confirmation
