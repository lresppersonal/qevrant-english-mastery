# English Mastery by QEVRANT — launch guide for personal use

## 1. Overview: which way to run it

There are two ways to run English Mastery.

| | **Hosted (recommended)** | **Local (optional)** |
|---|---|---|
| Where it runs | On the internet (Vercel), with your data in Supabase | Only on your laptop |
| Open on phone and other devices | Yes, from anywhere | Only while the laptop is on, and only on the same Wi-Fi |
| Accounts, Google sign-in, saved progress across devices | Yes | Yes, if you add the Supabase keys |
| Microphone (Speaking) | Works (https) | Works at `http://localhost:3000` on the laptop itself |
| Effort | About 1–2 hours, once | About 20 minutes, but you start it each time |

**Recommendation:** set up the **hosted** version once (sections 2–5). After that you just open a web address, like any website, on your laptop, phone or tablet. Use the local version (section 7) only if you want to change the code.

Without any keys, the app runs in **Demo mode**: everything works except accounts and AI feedback, and progress stays in that one browser.

## 2. Accounts and services you need

Create these free accounts first (use the same email for all of them if you like):

| Service | What it does | Needed? | Cost |
|---|---|---|---|
| **GitHub** (github.com) | Stores the app's code so Vercel can publish it | Yes | Free |
| **Supabase** (supabase.com) | Database, accounts, password reset, Google sign-in, recordings | Yes, for accounts and saving | Free plan is enough for personal use. Free projects may be paused after a period of no use; open the dashboard to wake them |
| **Vercel** (vercel.com) | Puts the app on the internet with an https address | Yes, for hosted use | Free "Hobby" plan is for personal, non-commercial use. Switch to a paid plan before you commercialise |
| **Anthropic Console** (console.anthropic.com) | The AI that analyses essays and speaking | Yes, for AI feedback | Pay-as-you-go: add a small credit. `AI_DAILY_LIMIT` caps daily use |
| **Google Cloud** (console.cloud.google.com) | Lets people press "Continue with Google" | Optional | Free |
| **OpenAI Platform** (platform.openai.com) | Higher-quality speech-to-text for Speaking | Optional. Without it, Chrome, Edge and Safari transcribe in the browser | Pay-as-you-go |

**Put the code on GitHub:**
1. Unzip `english-mastery-qevrant.zip` on your laptop.
2. On github.com, click **New repository**. Name it `english-mastery`, set it to **Private**, and click **Create**.
3. On the empty repository page, click **uploading an existing file**. Drag in **everything inside** the unzipped folder, including the hidden `.env.example` file, and click **Commit changes**. *(If the upload is too big for the browser, install **GitHub Desktop**: File → Add local repository → choose the folder → Publish.)*
4. Never upload a file called `.env.local`: it contains your secret keys.

## 3. Set up Supabase: database, accounts and Google sign-in

**A. Create the project**
1. supabase.com → **New project**. Name it `english-mastery`, choose a strong database password (save it in a password manager), choose the region **Central EU (Frankfurt)**, then click **Create**.
2. Wait about 2 minutes until the project is ready.

**B. Create the tables (run three files, in order)**
1. In the left menu, open **SQL Editor** → **New query**.
2. In the unzipped folder, open `supabase/migrations/20261116000001_learner_state.sql` in a text editor (Notepad or TextEdit). Copy all of it, paste it into Supabase and click **Run**. You should see "Success. No rows returned".
3. Repeat with `20261116000002_speaking_audio_storage.sql`.
4. Repeat with `20261117000003_listening_reports_preferences.sql`.
5. Repeat with `20261117000004_writing_reliability_dictionary.sql` (essay saving, drafts and the dictionary cache).

*Already set up an earlier version?* Run only the files you haven't run yet, in order.

These create the tables plus the security rules ("row-level security"): every learner can see and change only their own data.

**C. Copy your two keys**
- **Project Settings → API**: copy the **Project URL** (`https://xxxx.supabase.co`) and the **anon public** key. You'll paste these into Vercel. The anon key is meant to be public.
- Optional: the **service_role** key lets the server save dictionary entries to a shared cache, so words looked up once appear instantly for everyone. It is a powerful secret: put it **only** in the Vercel variable `SUPABASE_SERVICE_ROLE_KEY`, never in a variable starting with `NEXT_PUBLIC_`, and never share it.

**D. Email sign-in settings**
- **Authentication → Sign In / Providers → Email**: keep it enabled with **Confirm email** on.
- **Authentication → URL Configuration**:
  - **Site URL:** your Vercel address (you get it in step 4; come back and fill it in), e.g. `https://english-mastery.vercel.app`
  - **Redirect URLs**, add both: `https://english-mastery.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`
- The built-in email sender is limited to a few emails per hour. That's fine for personal use; before going public, add your own SMTP under **Authentication → Emails**.

**E. Google sign-in (optional)**

Users always sign in on Google's own page. The app never sees or stores Google passwords: Google sends back only the email and name.
1. console.cloud.google.com → create a project called `English Mastery`.
2. **APIs & Services → OAuth consent screen**:
   - choose **External**;
   - enter the app name, your support email and developer email;
   - Save.
   - While the screen is in **Testing**, add your own Google address under **Test users**. Click **Publish app** when you want anyone to be able to use it.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Under **Authorised redirect URIs**, add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`. Supabase shows this exact address on its Google provider page.
   - Click **Create**, then copy the **Client ID** and **Client secret**.
4. Supabase → **Authentication → Sign In / Providers → Google**: switch it on, paste the Client ID and secret, and Save.
5. In Vercel (next step), set `NEXT_PUBLIC_AUTH_GOOGLE` to `true` so the **Continue with Google** button appears.

## 4. Put it online with Vercel and add the keys

1. vercel.com → **Sign up with GitHub** → **Add New → Project** → choose your `english-mastery` repository → **Import**.
2. Before clicking Deploy, open **Environment Variables** and add these one by one:

| Name | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | Yes |
| `ANTHROPIC_API_KEY` | From console.anthropic.com → **API Keys → Create key** | Yes, for AI feedback |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Recommended |
| `AI_DAILY_LIMIT` | `20` (AI analyses per learner per day) | Recommended |
| `NEXT_PUBLIC_AUTH_GOOGLE` | `true` only after step 3E, otherwise `false` | Optional |
| `OPENAI_API_KEY` | From platform.openai.com → API keys | Optional (better speaking transcription) |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-transcribe`, or `whisper-1` if you also want long-pause counts | Optional |
| `DICTIONARY_AI_MODEL` | `claude-haiku-5-5` (fast model for dictionary entries) | Recommended |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (server only) | Optional (shared dictionary cache) |
| `GOOGLE_TTS_API_KEY` | Google Cloud API key with Text-to-Speech enabled | Optional (UK/US voices when no recording exists) |

   **Time limit for AI feedback:** essay feedback can take up to a minute or two. The app asks Vercel for up to 300 seconds. That needs **Fluid compute**, which is on by default for new projects: check **Project → Settings → Functions**. Without it, the free plan stops requests after 60 seconds and long essays may fail (the essay stays saved and you can press Retry).

   **Do not** set `AI_DEMO_ALLOW` on Vercel.
3. Click **Deploy** and wait 3–5 minutes. Vercel gives you an address such as `https://english-mastery.vercel.app`.
4. Go back to Supabase step 3D and put this address in **Site URL** and **Redirect URLs**.
5. **If you change a variable later:** Vercel → Project → **Settings → Environment Variables**, edit it, then **Deployments → ⋯ → Redeploy**. Variables starting with `NEXT_PUBLIC_` only take effect after a redeploy.
6. Keys are secrets. Don't share them or paste them into chats. If a key leaks, delete it in the provider's console and create a new one.

## 5. Create your account, log in and open it on every device

1. Open your Vercel address → **Create an account** (or **Continue with Google**).
2. With email: use a password of at least 8 characters with a letter and a number, then click the confirmation link in your inbox. You'll land on the welcome questions (name, goals, level, study days).
3. **Log in again later:** open the address → **Sign in**. If you forget your password, use **Forgot your password?** on the sign-in page; the reset link is valid for one hour. To change it while signed in, go to **Settings → Change password**.
4. **Laptop:** in Chrome or Edge, click the **Install** icon at the right of the address bar. English Mastery then opens in its own window from the Start menu or Dock.
5. **iPhone/iPad:** open the address in **Safari** → **Share** → **Add to Home Screen**.
6. **Android:** open it in **Chrome** → **⋮** → **Install app** (or **Add to Home screen**).
7. **Microphone:** go to **Settings → Privacy and permissions → Allow microphone**, then press **Test microphone** to check that recording works. You can also simply press Start in Speaking. Your browser shows its own prompt; the app can't change a browser block. If you blocked it, the page shows the exact steps for your browser.
8. **Cookie choice:** on your first visit, choose **Essential only** or **Allow preferences**. You can change this at any time in Settings or on the Privacy page.

## 6. How your progress and data are saved

- **Everything saves automatically** to your Supabase database as you study. This includes answers, exercise results, saved words and revision schedule, grammar progress, reading and listening history, speaking transcripts, AI feedback, essays, weekly reports and preferences. Sign in on any device and it's all there.
- **Essays:** your draft saves on the device as you type and to your account a moment later. Submitting saves the essay **before** AI assessment. If the AI fails, it stays under **Your submissions** with a **Retry** button, and **Continue where you left off** on the Writing page lists unfinished essays.
- **Weekly reports** are saved each time you open **Progress**, so you can compare weeks in the report's week selector.
- **Speaking audio** is not stored unless you switch on **Settings → Keep my speaking recordings**. Transcripts and feedback are always kept.
- **Back up regularly:** **Settings → Export all my data (JSON)**. The free Supabase plan has no point-in-time restore, so download an export now and then, for example monthly.
- **Delete things:**
  - **Settings → Delete all speaking recordings & transcripts**;
  - **Settings → Delete all essays**;
  - the bin icon on single studio sessions or listening logs;
  - **Delete my account**, which removes all your data, including recordings.
- **Demo mode** stores data only in that browser. Clearing browser data erases it, and it doesn't sync between devices.

## 7. Optional: run it on your own laptop

Use this when you want to change the code, or to try the app without hosting it.
1. Install **Node.js 20 or newer** from nodejs.org (the "LTS" version).
2. Open a terminal (Windows: **Terminal** or **PowerShell**; Mac: **Terminal**) and go to the unzipped folder, e.g. `cd Downloads/english-mastery-qevrant`.
3. Run `npm install` (once; takes a few minutes).
4. Copy `.env.example` to a new file named `.env.local` and fill in the same values as in Vercel. To test AI feedback without accounts, leave the Supabase lines empty and set `AI_DEMO_ALLOW=true` (local only).
5. Run `npm run dev` and open **http://localhost:3000**.
6. To stop it, press **Ctrl + C** in the terminal. To start it again later, open the terminal in that folder and run `npm run dev`.
7. To open it on your phone at home (same Wi-Fi), run `npm run dev -- -H 0.0.0.0` and visit `http://YOUR-LAPTOP-IP:3000`. The microphone won't work there, because phones require https; use the hosted version for that.
8. **To publish your changes:** upload the changed files to GitHub (or commit with GitHub Desktop). Vercel redeploys automatically within minutes.

## 8. Troubleshooting and status

| Problem | Fix |
|---|---|
| "Demo mode" banner on the hosted site | The Supabase variables are missing or misspelled in Vercel. Fix them, then Redeploy |
| Confirmation or reset link says "expired" | Links work once and expire after an hour. Request a new one. Check that **Redirect URLs** include `/auth/callback` |
| Google button says it isn't switched on | Enable Google in Supabase (3E). For other people to use it, also click **Publish app** on Google's consent screen |
| "AI feedback isn't configured" | Add `ANTHROPIC_API_KEY` in Vercel, check the Anthropic account has credit, then Redeploy |
| "AI service busy" | Wait a minute and retry. If it keeps happening, check your Anthropic usage limits |
| Microphone blocked or not found | Allow the microphone for the site, close other apps using it (video calls), and use https or localhost |
| "Couldn't reach the server" / AI unavailable in the preview | The single-file preview has no server, so AI, the online dictionary and accounts only work on your deployed address. Built-in dictionary entries still work there |
| Dictionary says the online dictionary didn't respond | Press **Try again**. Words in the built-in dictionary always work. Russian translations for other words need `ANTHROPIC_API_KEY` |
| Pronunciation shows "no UK audio available" | No recording exists for that accent and your device has no voice for it. Add `GOOGLE_TTS_API_KEY` for neural voices, or install an English (UK) voice in your system settings |
| Essay feedback failed | Your essay is saved: press **Retry assessment** (or **Retry** in Your submissions). If it says the AI service rejected the API key, check `ANTHROPIC_API_KEY` in Vercel |
| No transcript appears | Use Chrome, Edge or Safari, or add `OPENAI_API_KEY` for server transcription. You can always type the transcript before submitting |
| Site slow or "paused" after weeks unused | Open the Supabase dashboard; free projects are woken from there |

**What works now, and what needs configuration**

| Feature | Status |
|---|---|
| Grammar (A–H layout, 22 lessons, practice), vocabulary (939 items, revision), reading, listening library, progress and weekly reports, PWA install | **Fully working**, including in Demo mode |
| Accounts, cross-device saving, password reset, deletion and export | **Working once Supabase is set up** (sections 3–4) |
| Google sign-in | **Needs your Google Cloud OAuth client** (3E) |
| AI essay and speaking feedback with estimated band ranges | **Needs `ANTHROPIC_API_KEY`**. Estimates are educational, not official IELTS or Cambridge scores |
| Server speech-to-text, long-pause counting | **Optional:** `OPENAI_API_KEY` (pauses with `whisper-1`) |
| Pronunciation scoring | **Not included.** Feedback states that pronunciation is not assessed |
| Dictionary: built-in entries (vocabulary + 1,250 everyday and grammar words; every Reading passage covered) | **Fully working**, also offline and in the preview |
| Dictionary: any other English word (Wiktionary + AI), base forms, meaning in context | **Working online.** Russian, CEFR level and the meaning in context need `ANTHROPIC_API_KEY` |
| UK/US pronunciation | Recordings where Wiktionary has them, otherwise your device's voices. `GOOGLE_TTS_API_KEY` adds neural voices |
| Essay drafts, save-before-assess, retry, no duplicate submissions | **Fully working** (drafts sync across devices after migration 4) |
| Microphone permission check, test recording, specific error messages | **Fully working** on https or localhost |
| Cookie consent | **Fully working**. No analytics exist, so the analytics switch is informational |
| Remaining 2,420 audited headwords | **Draft with `npm run vocab:draft`** (needs an AI key), review, then `npm run vocab:promote` |

## 9. How to test everything yourself

Use your deployed address, signed in.

**Dictionary**
1. Open **Reading ▸ Loneliness**, tap **many**. You should see the Russian (много), the grammar ("determiner"), the sentence it came from, and UK/US buttons.
2. Tap a highlighted topic word (e.g. **habitat** in *Rewilding*) and check the **Full entry** link.
3. In **Dictionary**, look up **running** with the sentence "She was running late." It should say "-ing form of run".
4. Look up a word that isn't built in (e.g. **serendipitous**). With the AI key you get Russian and "Meaning here"; without it, the English definitions from Wiktionary.
5. Press **UK** and **US** to hear both pronunciations.
6. **Fallback:** turn on aeroplane mode and look up a new word. You should get a clear message and **Try again**; built-in words still work.

**Academic Writing**
1. Open any essay task and type at least 80 words. You should see "Saved on this device · saved to your account".
2. Refresh the page: the text is still there. Open the same task on your phone: the draft is there too.
3. Press **Get AI feedback**: the band range, corrections and advice appear, and the essay is listed under **Your submissions** as "Assessed".
4. To simulate a failure, turn off your internet just after pressing the button. You get an error saying the essay is saved, and **Retry assessment** works once you're back online.

**Speaking**
1. In **Settings ▸ Privacy and permissions**, press **Allow microphone**, then **Test microphone**. Play back the 4-second recording.
2. To check denial: block the microphone for the site in your browser (lock icon ▸ Microphone ▸ Block), then press Start in the Speaking studio. You should see "Microphone access was blocked" and steps for your browser. Unblock it again afterwards.
3. Generate a topic → Start → speak → Finish. Listen to your recording, then **Submit for AI feedback**.

**Privacy**
1. Open the site in a private window: the cookie banner appears. Choose **Essential only**. Reload: it doesn't come back.
2. Visiting Speaking or Settings never shows a microphone prompt until you press a microphone button.

For developers: `npm test` (unit tests) and `npx playwright test` (28 browser tests with simulated dictionary and AI outages).
