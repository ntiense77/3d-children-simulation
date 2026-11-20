# Bloomly — Classroom Simulation: Group Your Learners

A responsive React + Vite starter that recreates the four scenes in the supplied Bloomly reference: Welcome, Meet the Learners, Arrange the Class, and Results.

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite. To create a production bundle:

```bash
npm run build
npm run preview
```

## What's included

- **Welcome:** immersive classroom image, Bloomly identity and simulation introduction.
- **Meet the Learners:** 20 learner profiles with ability, learning style, personality, social skill, behaviour and a teacher note.
- **Arrange the Class:** drag-and-drop or click-to-assign interactions, four groups, five places per group, group capacity checks, reset and completion validation.
- **Results:** completion summary, group composition snapshot and reflective teaching takeaways.
- **Read aloud:** uses the browser's speech synthesis when supported.
- **References:** the original composite reference and four scene crops in `references/`.

## Interaction notes

On the Arrange screen, drag a learner into a group, or click the learner and then click **Add [name]** in a group. Click a learner already in a group to return them to the unplaced list. Learners can also be dragged between groups. A group cannot contain more than five learners, and Results only opens when all four groups contain exactly five learners.

The 20 learner profiles are sample simulation data in `src/learners.js`. Edit that file to change names, characteristics, notes or portrait assignments.

## Visual assets and reference images

The portrait and classroom assets in `public/assets/` are crops from the reference image supplied with the brief. A few portrait crops are reused to populate the 20 sample profiles; they are visual placeholders, not 20 distinct learner photographs. Replace them with appropriately licensed, consistent portrait photography before public or commercial release.

`references/` contains:

- `full-reference.png` — the complete supplied reference image.
- `01-welcome-reference.png` — Welcome scene crop.
- `02-meet-learners-reference.png` — Meet the Learners scene crop.
- `03-arrange-class-reference.png` — Arrange the Class scene crop.
- `04-results-reference.png` — Results scene crop.

The interface uses a warm peach, blush, ivory, lavender and purple palette. Manrope and DM Sans are loaded from Google Fonts with local system fallbacks.

## Project structure

```text
bloomly-classroom-simulation/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── lovable-handoff-prompt.md
├── src/
│   ├── App.jsx
│   ├── learners.js
│   ├── main.jsx
│   └── styles.css
├── public/
│   └── assets/
└── references/
```

## Lovable handoff

This is a standard React/Vite source project. Use the files as the implementation baseline in a Lovable React project, or place the project in a Git repository and connect that repository through Lovable's available GitHub workflow. Keep the four-scene flow and the grouping rules intact when asking Lovable to extend it.
