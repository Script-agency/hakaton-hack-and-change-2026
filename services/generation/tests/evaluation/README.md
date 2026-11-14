# Generation evaluation set

`demo_questions.json` is the 18-question / dialogue set supplied for the MVP. It is intentionally kept outside the knowledge corpus: questions are evaluation inputs, not facts the assistant may cite.

Use it to compare category routing, retrieved source documents, answer grounding and clarification behavior after importing `knowledge-base/`. Dialogue entries (14–18) must be submitted as a single user turn so the assistant receives the complete conversation context.
