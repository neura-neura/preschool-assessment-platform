# Preschool Assessment Editor

Static web app to draft, validate, and export preschool assessment reports in TXT format.

## Project Files

- `index.html`: app interface structure.
- `styles.css`: application styles.
- `app.js`: capture, validation, autosave, and export logic.

## Features

- Student management (add, duplicate, delete, and search).
- Editing for 8 fields per student with target length rules.
- Text normalization (uppercase, accents, punctuation, and comma rules).
- Error detection with manual validation flow.
- Repetition and similarity analysis across students.
- Progress saved in `localStorage` with TXT backup import/export.
- Final report export to TXT.

## Local Usage

No installation or build step is required.

1. Open `index.html` directly in your browser.
2. Optional: serve the folder with any static server.

## GitHub Pages Deployment

1. Push these files to your repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `.gitignore`
2. In GitHub, open `Settings > Pages`.
3. Under `Build and deployment`, select `Deploy from a branch`.
4. Choose your main branch (`main` or equivalent) and `/ (root)`.
5. Save and wait for the public Pages URL.

## Data Note

Captured data is stored in the user's browser (`localStorage`).
If you switch devices or browsers, export/import TXT backups to keep progress.
