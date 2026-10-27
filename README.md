# Vic Metro team feedback survey
Live: https://vicmetro.github.io/vicmetro-team-survey/  (add `?test=1` for test mode: banner + is_test=true)

- **Edit questions:** `src/questions.json` only (keep an `id` when rewording; new id for a new question). Then `python3 build.py`, copy `dist/*` to the repo root and push (see below).
- **Data:** Supabase `public.team_survey_responses` (anon INSERT only, RLS; no IP/device info). `supabase/migration_team_survey.sql`.
- **Slack:** `python3 slack_post/render.py row.json` renders a row for #vic-metro-hr (C0CCP2BBN1Y). Nothing posts automatically yet.
- **Test:** `python3 -m http.server 8766 -d dist & node test/e2e.js` (needs puppeteer-core).

Publish: `python3 build.py && cp dist/index.html dist/touch.png dist/.nojekyll . && git commit -am "update" && git push`
