# ProjectAI ⚡ — Learn AI. Farm Aura.

A gamified AI-literacy platform for Singapore classrooms, built in one morning at the **Edu2030 Vibe Hackathon** (13 Sep 2026, MOE HQ) for **Challenge 3: Education that Prepares Students for an AI-Driven Future**.

Students don't read about prompting: they prompt. A real LLM judges every prompt against a rubric, responds using that quest's context, and shows them exactly what their prompt earned: a thin, generic answer or something they could genuinely use. Better prompts, better responses, more aura, higher on the class leaderboard.

![Landing page](docs/screenshots/landing.png)

## How it works

The core loop is a chat with an agent:

1. Each quest drops the student into a chat with a scenario and an objective ("your CCA has 90 seconds at assembly — make the pitch deck").
2. The student writes a prompt. Two LLM calls fire concurrently:
   - **The judge** grades the prompt against the quest's rubric (the CRAFT framework — Context, Role, Action, Format, Tone) and returns a score, tier, and one line of coaching.
   - **The task agent** responds using the individual quest's scenario, learning goal, rubric, and safety boundaries. It produces only the quality and specificity the prompt earns.
3. The response renders as safe Markdown inside the scrollable chat. Website quests return a build brief; they do not generate or imitate a website.
4. Weak run → the agent avatar pops in with a roast and the missing rubric elements. Unlimited retries.
5. **Submit** locks it in: tier reveal, aura, leaderboard.

![Quest chat with a generated slide deck](docs/screenshots/quest-chat.png)

### Tiers

| Tier | Score | Aura |
|---|---|---|
| NPC 💀 | < 50 | +10 |
| Grinder 😤 | 50–79 | +25 |
| Aura Farmer 👑 | 80+ | +50 |

Top 3 in the class hold the **Aura Farmer** title. First-try success earns a bonus.

## The quests

![Quest map](docs/screenshots/quest-map.png)

**Prompting Arena** (LLM-judged, real execution):

| What you learn | Quest | You produce |
|---|---|---|
| AI is only as good as the context you give it | The 90-Second Pitch | A 5-slide CCA assembly pitch outline |
| Say what to build before it builds it | Ship the Party Site | A class-party website build brief |
| An agent needs steps, not wishes | IG Autopilot | A one-week agent plan for the class Instagram |
| Never trust a fact without a source | Don't Get Played | A research brief — and a trap |

**Don't Get Played** is the one we're proudest of: unless the student's prompt demands verification and sources, the agent plants two false facts and a fabricated citation in an otherwise-plausible research brief. Submit without catching them and the screen takes over: **🚨 FLAGGED — you just shipped a hallucination**, with the fakes revealed. That lesson sticks.

**Knowledge Grind** (quizzes): *Your eyes can be fooled — learn the tells* (real or fake?), *Using AI isn't cheating; hiding it is* (okay or not okay?), *Confident doesn't mean correct* (spot the cap).

## The classroom layer

![Leaderboard](docs/screenshots/leaderboard.png)

Students join with a name and a class code — no accounts, no email. The class leaderboard auto-refreshes; teachers get a dashboard showing per-student progress *and aggregated rubric gaps*, so they can see at a glance that, say, the whole class keeps forgetting **Format**.

![Teacher dashboard](docs/screenshots/teacher.png)

## Stack

- **Next.js 15** (App Router, TypeScript) — one process, API routes as the backend
- **SQLite** via better-sqlite3 — zero-setup persistence in `data/app.db`
- **OpenRouter → Claude Haiku 4.5** — structured judging plus contextual task-agent responses
- **Tailwind v4** + hand-rolled design tokens — the "arcade classroom" look
- Offline fallback everywhere: if the network dies mid-demo, a rule-based scorer and hand-written text responses keep the loop running

## Run it

```bash
npm install
echo "OPENROUTER_API_KEY=sk-or-..." > .env.local
npm run dev
```

Join with any name. Class code `3E4` comes pre-seeded with a class so the leaderboard and teacher dashboard aren't empty.

## Deploy to Railway

Connect this GitHub repository directly. The application now lives at the repository root, so
no Root Directory override is needed. Add `OPENROUTER_API_KEY` to the Railway service variables.
Mount a persistent volume at `/app/data` so SQLite progress survives deployments; the app uses
`data/app.db` relative to its working directory by default.

### Usage limits

Every judged or run prompt costs OpenRouter calls, so the public deployment is budgeted
(`src/lib/usage.ts`): 30 LLM-backed prompts per visitor (IP) per hour and 300 per day across
the site, with prompts cut at 4,000 characters. Over budget, a prompt is scored by the offline
rule-based judge and answered with the fallback response, so the quest keeps working and nothing
is spent. Change the budgets with `PAI_IP_LIMIT_PER_HOUR` and `PAI_DAILY_LIMIT`. The daily count
lives in the SQLite database, so it survives restarts when the volume is mounted.

## Honest limitations

Built in ~2 hours for a live demo, so: **there is no real auth**. Identity is a client-readable cookie and the landing page lets anyone pick "Teacher", so any viewer can open the teacher dashboard and read the whole class's progress. Role is never verified server-side; a request can also auto-create an account. Fine for one laptop in one classroom, disqualifying for anything shared — before this goes near real student data it needs a signed session and a server-side role. Grading calls cost real (tiny) money per run, within the usage limits above. The deepfake quiz ships without images until you add six to `public/deepfakes/`. None of this is production software; all of it is a working argument that AI literacy should be taught by doing.

## Credits

Built by the ProjectAI team at the Edu2030 Vibe Hackathon (Reactor School × MAJU, supported by MOE & MCCY). Mascot art generated, everything else hand-assembled under extreme time pressure and mild caffeine.
