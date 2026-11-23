# tinyfax

- Start with the [README](README.md) for project scope and the documentation index.
- Before changing architecture or requirements, read the [product contract](docs/product.md) and the relevant reference from the README. Confirm [unresolved choices](docs/unresolved.md) before relying on them in implementation. Examples are not protocol specifications.
- Before making claims about tested behavior, check the relevant OpenSpec change results and project references. Record new verification in the change's `results.md` with the test conditions, outcome, and gaps.
- Keep real credentials, private keys, and enrollment tokens out of Git. Use placeholders in examples.

## Writing

Before drafting or revising user-facing prose for this project, read `~/.pi/agent/skills/unslop/SKILL.md` and apply its rules.

## Design → specify → implement

1. **Design:** When starting a design discussion, suggest that the user run `/skill:grill-with-docs`. This skill requires manual invocation.
2. **Specify:** Once the design is agreed, use OpenSpec to draft specs and tasks. If the project’s OpenSpec skills are not installed, tell the user rather than silently substituting an ad hoc task list.
3. **Implement:** When asked to apply OpenSpec tasks, load and follow the `tdd` skill alongside the OpenSpec apply skill. Confirm test seams before writing tests. No separate TDD invocation is needed. Continue implementing tasks until the change is complete or the next step requires user input.
4. **Track progress:** Check off a step in the [roadmap](docs/roadmap.md) once its deliverable is complete and verified. Track implementation subtasks in OpenSpec.
