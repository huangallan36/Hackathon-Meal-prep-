# Sous

**A voice-first AI sous chef.** You come home tired, tap the orb and talk. Sous looks in your
fridge, suggests what you can cook with what you have, talks you through it step by step
while your hands are busy, then estimates the nutrition from a photo of the finished plate
and logs it to your diary.

Built in 24 hours for **StormHacks 2026**. Entered for MLH **Best Use of Gemini API** and
**Best Use of ElevenLabs**.

- **Gemini** is the brain: it decides what the app does next (function calling), reads your
  fridge and your plate (vision with structured JSON), and moderates Social posts.
- **ElevenLabs** is the voice: streamed text-to-speech with a voice picker.
- **Spoonacular** supplies real recipes, cached locally so the demo never depends on quota.

The app is a phone-shaped Next.js web app: a 390x844 phone frame on desktop, full screen on a
phone. Three tabs: **Diary | AI | Social**, plus a floating orb on every screen to talk to Sous.

---

## Demo script (for presenters)

About 3 minutes. Use desktop Chrome (or a normal Safari tab on iPhone), sound on, allow the mic.

1. **AI home** (`/ai`). Open the settings and tap **Reset demo data** if anyone has played
   with the app. Pick a voice if you like; it is remembered.
2. Tap **Start** and say: *"I'm wiped, I have no idea what to cook."*
   Gemini answers out loud and calls `open_fridge_camera`: the app jumps to the fridge scan.
3. Tap **Use sample photo**. Gemini vision lists the ingredients it sees (kale, strawberries,
   green onions, mushrooms, bell pepper, zucchini, eggs, milk...). They appear as **editable
   chips**: remove one, add "rice" to show it is your data.
4. Tap **Find recipes**. Recipes are ranked by how much of your fridge they use; each card shows
   "+N missing" (tap **Groceries** for the shopping checklist if you want to show it).
5. Pick a recipe (tap it, or say *"let's do the first one"*). **Cooking mode** opens and Sous
   reads step 1.
6. Cook hands-free: say *"next"*, *"repeat that"*, *"go back"*. Steps with a time get a timer
   chip; the timer keeps running across screens.
7. On the last step say *"done"*. Tap **Snap your finished meal** -> **Use sample photo**.
8. Gemini estimates the dish plus calories, protein, carbs, fat and fiber. The card is marked
   **Estimated** and every number is editable. Tap **Log to diary**.
9. The **Diary** tab shows the meal in today's totals (calorie ring, macro bars, week chart).
10. **Share to Social**: the photo and dish name are prefilled, Gemini checks the photo and
    caption, and the post lands in the feed. Swipe the feed, upvote, open a cook's profile,
    and show **Most Popular** in the meal planner.

If the wifi is bad, keep going: every step has an offline fallback (see below), and the
sample photo's canned ingredient list matches what Gemini sees in it.

---

## Features and prize mapping

### Best Use of Gemini API

| What | Where |
| --- | --- |
| **Function calling drives the UI.** Every voice turn forces exactly one tool call: `open_fridge_camera`, `show_recipes`, `start_cooking(recipeId)`, `show_groceries`, `log_meal`, `next_step`, `previous_step`, `repeat_step`, or `reply`. The spoken line rides along as an argument, so one ~1 s round trip both talks and navigates. Calls are validated against the current app state (no invented recipe ids). | `app/api/chat`, `lib/server/chat-prompt.ts` |
| **Structured JSON vision: ingredients.** Fridge photo -> `{ ingredients: [{ name, confidence }] }` via `responseJsonSchema`, then cleaned into editable chips. | `app/api/vision/ingredients` |
| **Structured JSON vision: nutrition.** Plate photo -> dish name, portion, calories, protein, carbs, fat, fiber, shown as an editable "Estimated" card. | `app/api/vision/meal` |
| **Image + caption moderation** for Social posts, with a local rule check as backstop. | `app/api/moderate`, `lib/social/moderation-*.ts` |
| **Model fallback chain.** Flash models often return 503 "high demand", so every call walks a chain with per-attempt timeouts; the fridge scan is *hedged* (the next model starts in parallel if the first is slow, first valid answer wins). | `lib/server/gemini.ts`, `lib/kitchen/hedge.ts` |

### Best Use of ElevenLabs

| What | Where |
| --- | --- |
| **Streaming TTS proxy** with `eleven_flash_v2_5` (low latency): audio streams to the browser as it is generated; time-to-first-byte and total timeouts so it can never hang. The key stays on the server. | `app/api/tts`, `lib/server/elevenlabs.ts` |
| **Voice picker with 6 voices and previews** (Jessica, George, Bella, Chris, Charlie, Lily). | `app/api/voices`, `components/voice/VoicePicker.tsx` |
| **Persisted voice choice** across reloads. | `lib/stores/prefs.ts` |
| **Browser-voice fallback**: if ElevenLabs fails, Sous keeps talking with `speechSynthesis`. | `lib/voice/audio.ts` |

### Everything else

- **Voice engine**: tap-to-talk, half duplex (the mic never hears Sous), barge-in by tapping the
  orb, type instead of talking, stale-response protection. Speech-to-text is the browser's Web
  Speech API. `lib/voice/*`
- **Cooking mode**: big step cards, spoken steps, timers detected from step text, ingredients
  per step, optional video tutorial. `app/ai/cook/[id]`
- **Grocery list** for missing ingredients with nearby-store directions. `app/ai/groceries/[id]`
- **Meal planner**: search, filters, Most Popular (from Social upvotes), recently cooked. `app/ai/plan`
- **Diary**: daily calorie ring, macro and micronutrient progress, week strip and chart, month
  calendar, per-day detail. `app/diary`
- **Social**: swipeable feed, upvotes, profiles, post composer with moderation. `app/social`

---

## Architecture

Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, zustand,
motion, lucide-react, `@google/genai`. No database: state lives in the browser
(`localStorage`, keys `sous:v1:*`) and every API route is stateless.

### Screens

| Route | Screen |
| --- | --- |
| `/` | redirects to `/ai` |
| `/ai` | AI home: greeting, Start, quick actions, settings (voice, reset demo) |
| `/ai/talk` | Conversation with transcript |
| `/ai/fridge` | Fridge scan -> editable ingredient chips |
| `/ai/recipes` | Recipes ranked by fridge match |
| `/ai/groceries/[id]` | Missing-ingredient checklist |
| `/ai/cook/[id]` | Step-by-step cooking mode |
| `/ai/snap` | Snap the finished meal -> nutrition estimate -> log |
| `/ai/plan` | Meal planner |
| `/diary`, `/diary/[date]` | Food diary |
| `/social`, `/social/new`, `/social/u/[handle]` | Feed, composer, profiles |

### API routes

All run on the Node.js runtime with an explicit `maxDuration`, validate their input, never log
keys or images, and answer with a usable fallback instead of a bare 500.

| Route | What it does | Fallback |
| --- | --- | --- |
| `POST /api/chat` | One Sous turn: Gemini picks one tool + the spoken reply | Keyword intent router (`lib/intents.ts`), `source: "fallback"` |
| `POST /api/tts` | Streams ElevenLabs audio (mp3) | JSON `{ fallback: true }`; the client speaks with the browser voice |
| `GET /api/voices` | 6 premade ElevenLabs voices, cached 10 min | Verified static voice list |
| `POST /api/vision/ingredients` | Fridge photo -> ingredients (hedged Gemini vision) | Sample fridge ingredients (`lib/sample.ts`) |
| `GET /api/recipes/by-ingredients` | Spoonacular `findByIngredients` + `informationBulk` | Bundled catalog ranked locally, `source: "cache"` |
| `GET /api/recipes/[id]` | Memory cache -> bundled catalog -> Spoonacular | 404 JSON; `loadRecipe()` checks the store and bundled catalog before calling it |
| `GET /api/recipes/search` | Catalog first; Spoonacular only when it finds < 3, with an hourly budget | Catalog results |
| `POST /api/vision/meal` | Plate photo -> dish + nutrition (Gemini vision) | The recipe's per-serving nutrition, or a generic plate |
| `POST /api/moderate` | Gemini checks photo + dish name + caption | Local caption rules |

### Client state (`lib/stores`)

| Store | Holds | Persisted |
| --- | --- | --- |
| `usePrefs` | Name, chosen ElevenLabs voice | yes |
| `useVoice` | Conversation status + transcript | no |
| `useKitchen` | Fridge ingredients, recipe matches, active recipe, step, timers | yes |
| `useDiary` | Diary entries (seeded days + your logged meals) | yes |
| `useSocial` | Posts, upvotes, follows, share draft | yes |
| `useToast` | Toasts | no |

### Recipe cache and seed script

Spoonacular's free plan is 50 points/day, so the app ships its own catalog:
`data/recipes.json` holds raw Spoonacular recipe objects (trimmed), normalized at runtime by
`lib/recipes/normalize.ts` exactly like live responses. Live calls only happen when a key is set
and `SOUS_FORCE_CACHE` is not `1`; any error falls back to the catalog.

`npm run seed` (`scripts/seed-recipes.mjs`, no dependencies) rebuilds the catalog: 7
popularity-sorted searches (chicken, beef, salmon, eggs, rice, pasta, vegetables), a filter
(image, clean title, <= 60 min, 3-14 steps, real meals), 3 picks per query (~21 recipes), then
`informationBulk` with nutrition for the picks only (2 calls of <= 20 ids). Requests run one at
a time, 1.1 s apart (free plan: 1 request/s). It costs about **23 points**, prints the quota headers,
and never overwrites the cache on a bad key (401), exhausted quota (402), rate limit (429) or
network error. `npm run seed -- --dry-run` prints the plan and cost without any requests.
The previous catalog is kept in `.tmp/data/recipes.prev.json`.

Until the seed has been run, `data/recipes.json` holds 3 "Sous Test Kitchen" placeholder
recipes with a drawn placeholder image, so **run the seed before demo day** for real food
photos. The catalog is imported at build time: restart `npm run dev` (or rebuild / redeploy)
after seeding, commit the new `data/recipes.json`, and tap **Reset demo data** once so the
fridge matches saved from the old catalog are cleared (Social re-seeds itself when the catalog
changes). Optional YouTube tutorials are mapped by recipe id in `data/youtube.json`
(`{ "<recipeId>": "<youtubeVideoId>" }`, edited by hand).

---

## Setup

Requires **Node.js 20.9+**.

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run seed                 # recommended: ~21 real recipes into data/recipes.json (needs a Spoonacular key)
npm run avatars              # optional: avatars are already committed in public/avatars
npm run dev                  # http://localhost:3000
```

Keys:

- **Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **ElevenLabs**: [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
  (permissions: Text to Speech, Voices read)
- **Spoonacular** (optional, free plan): [spoonacular.com/food-api/console](https://spoonacular.com/food-api/console)

The app runs with no keys at all: it falls back to canned answers, the bundled catalog and the
browser voice. Keys only make it smarter.

### Environment variables

All are read on the server only. **Never prefix them with `NEXT_PUBLIC_`.**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | for AI features | | Chat, vision, moderation |
| `ELEVENLABS_API_KEY` | for the premium voice | | TTS + voice list |
| `SPOONACULAR_API_KEY` | optional | | Live recipes + `npm run seed` |
| `GEMINI_CHAT_MODEL` | no | chain: `gemini-3.5-flash-lite`, `gemini-3.7-flash` | Put a model first in the chat chain |
| `GEMINI_VISION_MODEL` | no | chain: `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-3.5-flash-lite` | Put a model first in the vision chain |
| `ELEVENLABS_MODEL_ID` | no | `eleven_flash_v2_5` | TTS model |
| `ELEVENLABS_DEFAULT_VOICE_ID` | no | Jessica | Voice before the user picks one |
| `SOUS_FORCE_CACHE` | no | `0` | `1` = never call Spoonacular, serve the bundled catalog |

---

## Deploy to Vercel

1. Run `npm run seed` locally and commit `data/recipes.json` (the build bundles it), then push
   the repo to GitHub (`.env.local` is git-ignored; only `.env.example` is committed).
2. In Vercel, **Add New -> Project** and import the repo. The framework preset is detected
   (Next.js); keep the default build settings.
3. Under **Settings -> Environment Variables**, add `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` and
   optionally `SPOONACULAR_API_KEY` / the overrides above, for **Production** and **Preview**.
4. Deploy. Fluid compute is the default and suits the streaming TTS route; each route sets its
   own `maxDuration`.
5. Backup plan if the venue network or Vercel misbehaves: `npm run build && npm start` on a
   laptop and demo from `http://localhost:3000`.

---

## Demo-day reliability notes

- Use **desktop Chrome** or a **normal iOS Safari tab**. Avoid Edge, Brave and home-screen
  (PWA) mode: their Web Speech support is unreliable. Tap Start yourself so the browser lets
  audio play.
- Tap **Reset demo data** (AI home -> settings) before presenting.
- Set `SOUS_FORCE_CACHE=1` to save Spoonacular quota; the bundled catalog covers the demo path.
- Every API has a fallback (table above): no key, a 503 from Gemini, a slow ElevenLabs or no
  network all degrade to canned data or the browser voice instead of an error screen.
- Gemini's free tier has **per-model daily caps** (`gemini-3.7-flash` allowed 20 requests/day on
  our key). The chain falls through to the next model automatically; on demo day use a billed
  key, or point `GEMINI_VISION_MODEL` / `GEMINI_CHAT_MODEL` at a model that still has quota.
- The sample fridge photo's fallback ingredient list matches what Gemini sees in it, so a
  fallback scan looks identical to a live one.

---

## Credits

- Recipe data and recipe/ingredient images: [Spoonacular API](https://spoonacular.com/food-api)
  (backlink shown on recipe screens). Each recipe also credits its original source and links to it.
- Sample fridge photo: **Ello** on [Unsplash](https://unsplash.com/photos/AEU9UZstCfs), Unsplash
  License. Full list in [`public/CREDITS.md`](public/CREDITS.md).
- Avatars: [DiceBear](https://www.dicebear.com) **Notionists** style by Zoish, CC0 1.0.
- Fonts: Fraunces (Undercase Type) and Inter (Rasmus Andersson), SIL Open Font License 1.1.
- Icons: [Lucide](https://lucide.dev), ISC.
- AI: Google Gemini API; voice: ElevenLabs.
