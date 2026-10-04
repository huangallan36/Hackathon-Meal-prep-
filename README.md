# Sous

**A voice-first AI sous chef.** You come home tired, pick a sous-chef and talk. Sous looks in
your fridge, suggests what you can cook with what you have, talks you through it step by step
while your hands are busy, then logs what you ate (with macros, vitamins and minerals) to your
diary.

Built in 24 hours for **StormHacks 2026**. Entered for MLH **Best Use of Gemini API** and
**Best Use of ElevenLabs**.

- **Gemini** is the brain: it decides what the app does next (function calling), reads your
  fridge and your plate (vision with structured JSON), estimates nutrition from a photo or a
  sentence ("chicken wrap and a latte"), and moderates Social posts.
- **ElevenLabs** is the voice: four sous-chef personas (Maya, Leo, Nova, Brock), each a mascot
  with its own voice, streamed with a low-latency model, in tap-to-talk or hands-free
  conversation mode.
- **Recipes** come from a bundled catalog of the 10 dishes in the design, stored in
  Spoonacular's recipe format with credited photos. Live Spoonacular search is wired in for when
  a key is set.

The app is a phone-shaped Next.js web app: a 390x844 phone frame on desktop, full screen on a
phone. The UI follows the team's Figma file *Stormhacks 2026 (Updated)*. Four tabs:
**Planner | Home | Diary | Me**, plus a floating mascot bubble while a call is running.

---

## Demo script (for presenters)

About 3 minutes. Use desktop Chrome (or a normal Safari tab on iPhone), sound on, allow the mic.

1. **Home.** Tap **Settings** (bottom of Home) and **Reset demo data** if anyone has played
   with the app. Under **Who's cooking with you?**, choose Maya, Leo, Nova or Brock; each one
   greets you in their own voice (remembered across reloads).
2. Tap **Start talking** and say: *"I'm wiped, I have no idea what to cook."*
   Sous answers out loud and calls `open_fridge_camera`: the app jumps to the fridge scan.
3. Tap **Use sample photo**. Gemini lists the ingredients it sees as **editable chips**: remove
   one, add "rice" to show it's your data.
4. Tap **Find recipes**. Recipes are ranked by how much of your fridge they use; each shows what's
   missing, and **Groceries** turns that into a checklist with nearby stores.
5. Pick a recipe (tap it, or say *"let's do the first one"*). **Cooking mode** opens and Sous
   reads step 1.
6. Turn on **Hands-free** and just talk: *"next"*, *"repeat that"*, *"go back"*, *"can I use
   frozen corn instead?"*. Sous starts listening again after every answer. Steps with a time get
   a timer that keeps running across screens.
7. Minimize the call: Sous docks as a **floating bubble** over a phone home screen and keeps
   listening. Tap the bubble to come back.
8. On the last step say *"done"*, tap **Snap your finished meal** -> **Use sample photo**.
   Gemini estimates the dish, calories, macros and micronutrients; every number is editable and
   marked **Estimated**. Tap **Log to diary**.
9. **Diary** shows today's meals, energy rings and the full nutrient breakdown (on track /
   a bit low / low / over). **Me** shows weekly averages and highlighted nutrients.
10. Back on Home, say *"Log my lunch — chicken wrap and a latte."* Sous splits it into foods,
    estimates each one and logs them without a photo.
11. **Share to Social** (under **Me**): photo and dish are prefilled, Gemini checks the post, and
    it lands in the swipeable feed. Upvotes feed **Most popular** in the Planner.

If the wifi is bad, keep going: every step has an offline fallback (see below).

---

## Features and prize mapping

### Best Use of Gemini API

| What | Where |
| --- | --- |
| **Function calling drives the UI.** Each voice turn returns at most one tool call: `open_fridge_camera`, `show_recipes`, `start_cooking(recipeId)`, `show_groceries`, `log_meal`, `log_food(description, meal)`, `next_step`, `previous_step`, `repeat_step`. The spoken reply comes back in the same ~1 s round trip. Calls are validated against the app state, so recipe ids can't be invented. | `app/api/chat`, `lib/server/chat-prompt.ts` |
| **Vision to JSON: fridge.** Photo -> `{ ingredients: [{ name, confidence }] }` via `responseJsonSchema`, cleaned into editable chips. The scan is *hedged*: if the first model is slow, the next one starts in parallel and the first valid answer wins. | `app/api/vision/ingredients`, `lib/kitchen/hedge.ts` |
| **Vision to JSON: nutrition.** Plate photo -> dish, portion, calories, macros and micronutrients, shown as an editable "Estimated" card. | `app/api/vision/meal` |
| **Text to nutrition.** "Chicken wrap and a latte" -> one item per food with full nutrients, used by voice logging and the Diary's add-food sheet. | `app/api/nutrition/estimate` |
| **Image + caption moderation** for Social posts, with local rules as a backstop. | `app/api/moderate` |
| **Model fallback chain.** Flash models often return 503 or per-model daily quota errors, so every call walks a chain of models with per-attempt timeouts. | `lib/server/gemini.ts` |

### Best Use of ElevenLabs

| What | Where |
| --- | --- |
| **Four personas** from the design (Maya the tomato, warm; Leo the avocado, calm, the default; Nova the lemon, upbeat; Brock the broccoli, a protein-minded coach), each an ElevenLabs premade voice with its own mascot, colour and speaking style in the chat prompt. Picking one plays an in-character greeting recorded with `eleven_v4` (`npm run voices`), so it's instant and works offline. | `lib/voice/personas.ts`, `public/voices`, `components/mascot` |
| **Streaming TTS proxy** with `eleven_flash_v2_5`, with first-byte and total timeouts so it can never hang. The key stays on the server. | `app/api/tts`, `lib/server/elevenlabs.ts` |
| **Hands-free conversation mode**: after Sous speaks, the mic reopens on its own (never while audio plays, so Sous doesn't hear itself) and stops after a few silent rounds. | `lib/voice/engine.ts` |
| **Browser-voice fallback**: if ElevenLabs fails or is rate limited, Sous keeps talking with `speechSynthesis`. | `lib/voice/audio.ts` |

### Everything else

- **Voice engine**: tap-to-talk or hands-free, barge-in by tapping the mascot, type instead of
  talking, protection against stale responses. Speech-to-text is the browser's Web Speech API.
  Instant "next / back / repeat" in cooking mode without a network round trip. `lib/voice/*`
- **Mascot call screen**: the chosen mascot on soft rings in its colour, with idle, listening,
  thinking and speaking states. It follows the phone: white in light mode, black in dark mode.
- **Docked bubble**: minimize Sous into a draggable mascot bubble over a simulated phone home
  screen; it keeps listening and shows captions, and a Live Activity card shows the call and the
  current recipe step. Drag the bubble onto the ✕ to hang up.
- **Cooking mode**: step list with the current step expanded, spoken steps, timers detected from
  step text, technique tutorials ("How to dice an onion") and video cards. `app/ai/cook/[id]`
- **Groceries**: Need / Have checklist for a recipe, add items, two nearby stores with price
  estimates (demo values). `app/ai/groceries/[id]`
- **Planner**: search with voice input, filters, Most popular (from Social upvotes), recently
  made, ingredient combinations and similar recipes. `app/planner`
- **Nutrient tracking**: 15 nutrients with daily targets (calories, protein, carbs, fat, fiber,
  iron, calcium, potassium, vitamins A, C and D, plus sodium, sugar, saturated fat and cholesterol
  as limits). Every logging path records them: photo, recipe, voice and typed. `lib/nutrients.ts`
- **Diary and Me**: daily diary per meal with an add-food sheet and "Log dinner by voice", energy
  rings, nutrient breakdown with statuses, month calendar, weekly averages and highlighted
  nutrients with a Sous tip. `app/diary`, `app/me`
- **Social**: swipeable feed (right = upvote, left = skip), profiles, composer with moderation;
  no calories are ever shown publicly. `app/social`

---

## Architecture

Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, zustand,
motion, lucide-react, `@google/genai`. No database: state lives in the browser
(`localStorage`, keys `sous:v1:*`) and every API route is stateless.

### Design system

All visual values come from the Figma file and its "Design rules v1" frame, and live as tokens
in `app/globals.css`. Each mascot gives the palette a colour: Leo avocado `#3d6b2e` is the
primary (buttons, active tabs, protein), Nova lemon `#d9ac3e` is carbs, Maya tomato `#d8604a` is
fat and warnings, plus info blue `#5f85b2`, ink `#1e1d1a` and a cream `#fbf8f3` background. The
chosen voice tints the AI surfaces (call rings, avatars, speaker label). Headings use Bricolage
Grotesque SemiBold, body text DM Sans. The mascot art (`public/mascots/<persona>/`) is drawn by
`components/mascot/Mascot.tsx`: `MascotAvatar` (head in a soft circle, 24–64 px), `MascotFigure`
(full body, 120 px and up) and `SousLogo`. Exported Figma assets are in `public/figma/v2/`.
Shared primitives are in `components/ui/`.

### Screens

| Route | Screen |
| --- | --- |
| `/` | Redirects to `/ai` |
| `/ai` | Home: logo, greeting, "Who's cooking with you?" persona picker, Start talking, things to try, Settings |
| `/ai/talk` | Live call: the mascot on soft rings (white, or black in dark mode), transcript, quick actions, Pause / Type / End, hands-free toggle; Type switches to the chat view |
| `/ai/fridge` | Fridge scan -> editable ingredient chips |
| `/ai/recipes` | Recipes ranked by fridge match |
| `/ai/cook/[id]` | Cooking mode |
| `/ai/groceries/[id]` | Groceries checklist and nearby stores |
| `/ai/snap` | Snap the finished meal -> nutrition estimate -> log |
| `/planner` | Meal planner and search (`/ai/plan` redirects here) |
| `/diary`, `/diary/[date]` | Daily diary (today, or a date): energy rings, meals, log by voice, nutrient breakdown |
| `/diary/calendar` | Month calendar: on target / over / partial days, day card, logging streak |
| `/me` | Personal stats: weekly averages, macros, activity, Community (Social) |
| `/me/nutrients` | Highlighted nutrients: weekly averages vs targets, a tip from your sous-chef ("Sure" opens matching recipes) |
| `/social`, `/social/new`, `/social/u/[handle]` | Feed, composer, profiles |

### API routes

All run on the Node.js runtime with an explicit `maxDuration`, validate their input, never log
keys or images, and answer with a usable fallback instead of a bare 500.

| Route | What it does | Fallback |
| --- | --- | --- |
| `POST /api/chat` | One Sous turn: reply + at most one tool call | Keyword intent router (`lib/intents.ts`) |
| `POST /api/tts` | Streams ElevenLabs audio (mp3) | JSON `{ fallback: true }`; the browser voice speaks |
| `GET /api/voices` | Premade ElevenLabs voices, cached 10 min | Verified static voice list |
| `POST /api/vision/ingredients` | Fridge photo -> ingredients (hedged) | Sample fridge ingredients (`lib/sample.ts`) |
| `POST /api/vision/meal` | Plate photo -> dish + nutrients | The recipe's per-serving nutrition, or a generic plate |
| `POST /api/nutrition/estimate` | Food description -> items with nutrients | Built-in table of common foods |
| `GET /api/recipes/by-ingredients` | Spoonacular `findByIngredients` + `informationBulk` | Bundled catalog ranked locally |
| `GET /api/recipes/[id]` | Memory cache -> bundled catalog -> Spoonacular | 404 JSON (the client checks its stores first) |
| `GET /api/recipes/search` | Catalog first; Spoonacular only when needed, with an hourly/daily budget | Catalog results |
| `POST /api/moderate` | Gemini checks photo + dish + caption | Local caption rules |

### Client state (`lib/stores`)

| Store | Holds | Persisted |
| --- | --- | --- |
| `usePrefs` | Name, chosen voice persona, hands-free mode | yes |
| `useVoice` | Call status + transcript | no |
| `useKitchen` | Fridge ingredients, matches, active recipe, step, timers, grocery checks | yes |
| `useDiary` | Diary entries (seeded history + your logged meals) | yes |
| `useSocial` | Posts, upvotes, follows, share draft | yes |

### Recipe catalog and seed script

Spoonacular's free plan is 50 points/day, so the app ships its own catalog: `data/recipes.json`
holds the 10 dishes from the design (ids 910001–910010, from Chicken Tikka Bowl to Beef & Rice
Skillet) as Spoonacular-format recipe objects with full nutrition, normalized at runtime by
`lib/recipes/normalize.ts` exactly like live responses. Each one links its source recipe and has
a credited photo (`public/recipes/`); ingredient photos are in `public/ingredients/`, and every
photo is credited in [`public/CREDITS.md`](public/CREDITS.md). YouTube tutorials are mapped by
recipe id in `data/youtube.json`. Live Spoonacular calls only happen when a key is set and
`SOUS_FORCE_CACHE` is not `1`; any error falls back to the catalog.

`npm run seed` (`scripts/seed-recipes.mjs`, no dependencies) **replaces** the catalog with about
21 live Spoonacular recipes from 7 searches (roughly 23 points). Only run it if you want live
data instead of the design's dishes. It never overwrites the cache on a bad key, exhausted quota,
rate limit or network error, and `npm run seed -- --dry-run` shows the plan without requests.

---

## Setup

Requires **Node.js 20.9+**.

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run voices               # optional: re-record the persona greetings (already committed)
npm run dev                  # http://localhost:3000
```

Keys:

- **Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **ElevenLabs**: [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
  (permissions: Text to Speech, Voices read)
- **Spoonacular** (optional, free plan): [spoonacular.com/food-api/console](https://spoonacular.com/food-api/console)

The app runs with no keys at all: it falls back to canned answers, the bundled catalog and the
browser voice. Keys make it smarter.

### Environment variables

All are read on the server only. **Never prefix them with `NEXT_PUBLIC_`.**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | for AI features | | Chat, vision, nutrition estimates, moderation |
| `ELEVENLABS_API_KEY` | for the premium voices | | TTS + voice list |
| `SPOONACULAR_API_KEY` | optional | | Live recipes + `npm run seed` |
| `GEMINI_CHAT_MODEL` | no | chain: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.6-flash` | Put a model first in the chat chain |
| `GEMINI_VISION_MODEL` | no | chain: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.7-flash` | Put a model first in the vision chain |
| `ELEVENLABS_MODEL_ID` | no | `eleven_flash_v2_5` | TTS model |
| `ELEVENLABS_DEFAULT_VOICE_ID` | no | Leo's voice | Voice before a persona is picked |
| `SOUS_FORCE_CACHE` | no | `0` | `1` = never call Spoonacular |

---

## Deploy to Vercel

1. Push the repo to GitHub (`.env.local` is git-ignored; only `.env.example` is committed).
2. In Vercel, **Add New -> Project** and import the repo; keep the detected Next.js settings.
3. Under **Settings -> Environment Variables**, add `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` and
   optionally `SPOONACULAR_API_KEY` / the overrides above, for **Production** and **Preview**.
4. Deploy. Phones need HTTPS for the microphone, so demo on a phone from the Vercel URL.
5. Backup if the venue network or Vercel misbehaves: `npm run build && npm start` on a laptop and
   demo from `http://localhost:3000`.

---

## Demo-day reliability notes

- Use **desktop Chrome** or a **normal iOS Safari tab**. Avoid Edge, Brave and home-screen (PWA)
  mode: their speech recognition is unreliable. iOS Safari may need a tap per turn even in
  hands-free mode; the app falls back to tap-to-talk and says so.
- Tap **Reset demo data** (Home -> Settings) before presenting.
- Set `SOUS_FORCE_CACHE=1` to save Spoonacular quota; the bundled catalog covers the demo path.
- Every API has a fallback (see the table): no key, a Gemini 503, a slow ElevenLabs or no network
  all degrade to canned data or the browser voice instead of an error screen.
- Gemini's free tier has **per-model daily caps**. The chain falls through to the next model; for
  judging, use a billed key or avoid test loops right before the demo.

---

## Credits

- UI design and mascots (Maya, Leo, Nova, Brock): the team's Figma file *Stormhacks 2026
  (Updated)*; icons, mascot art and illustrations exported from it.
- Recipes: each catalog dish credits and links its original source recipe. Live recipes, when a
  key is set, come from the [Spoonacular API](https://spoonacular.com/food-api) with its backlink.
- Photos: 19 dish, ingredient and store photos from [Wikimedia Commons](https://commons.wikimedia.org)
  and the sample fridge photo by **Ello** on [Unsplash](https://unsplash.com/photos/AEU9UZstCfs),
  all credited in [`public/CREDITS.md`](public/CREDITS.md); dish and store photos are also
  credited on screen.
- Avatars: [DiceBear](https://www.dicebear.com) **Notionists** style by Zoish, CC0 1.0.
- Fonts: Bricolage Grotesque (Mathieu Triay) and DM Sans (Colophon Foundry), SIL Open Font
  License 1.1.
- Icons: [Lucide](https://lucide.dev), ISC, alongside the Figma exports.
- AI: Google Gemini API; voice: ElevenLabs.
