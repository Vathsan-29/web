website build

Files
- index.html — structure for all four Figma designs, in narrative order:
  Prologue (hero + archival tokens) → Act I (chapters 01–11) → Act II (sections three to six: centerpiece, constellation canvas, 143-language archive, transition) → Act III (envelope letter + closing footer).
- style.css — design tokens and responsive layout (breakpoints at 1280, 1024, 880, 720, 380 px).
- app.js — language grid with search and region filters, favourites (saved in localStorage), constellation canvas, wax seals, envelope, soft ambient music (Web Audio, starts only when toggled), scroll-spy and reveal animations.
- data.js — the 143 language entries and the 12 constellation nodes.

Photos
The Figma photographs (open book, wax seal, manuscript, handwritten folios) are hosted on temporary Figma URLs that expire after 7 days. They are not included here. The places they appear are marked with `.photo` placeholders in index.html. To add them, export each image from Figma, put it in an `assets/` folder, and replace the `.photo` div with `<img src="assets/<file>" alt="...">`.

Running it
Open index.html in a browser. No build step or backend is needed.
