# tinyfax

- Start with the [README](README.md) for project scope and the documentation index.
- Before changing architecture or requirements, read [design decisions and boundaries](docs/design/01-decisions-and-boundaries.md) and the relevant design chapter. Preserve the decision labels: preferred, illustrative, and open details are not requirements or a wire specification. Confirm unresolved choices before relying on them in implementation.
- Before making claims about tested hardware, firmware, or printer behavior, check [current project state](docs/status/CURRENT_STATE.md). Record new verification there, with the test conditions and outcome; keep proposals in `docs/design/`.
- Keep real credentials, private keys, and enrollment tokens out of Git. Use placeholders in examples.

## Design → specify → implement

1. **Design:** When starting a design discussion, suggest that the user run `/skill:grill-with-docs`. This skill requires manual invocation.
2. **Specify:** Once the design is agreed, use OpenSpec to draft specs and tasks. If the project’s OpenSpec skills are not installed, tell the user rather than silently substituting an ad hoc task list.
3. **Implement:** When asked to apply OpenSpec tasks, load and follow the `tdd` skill alongside the OpenSpec apply skill. Confirm test seams before writing tests. No separate TDD invocation is needed.
