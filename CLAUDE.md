# Käänik chatbot – project notes

- The app is deployed on Railway automatically from the `main` branch of this GitHub repo.
- The database is a Railway PostgreSQL database, available only through the `DATABASE_URL` environment variable on Railway.
- Do not set up a local database or a local server.
- Before every push, run `npm run build` to make sure the app builds.
- After each finished task, commit and push to GitHub so that Railway deploys the new version.
- All user-facing text in the app is in Estonian.
- Mock AI answers come from `data/naidisvastused.csv` (columns id, teema, tase, kysimus, vastus); the CSV is not stored in the database.
