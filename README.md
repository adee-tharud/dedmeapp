# deadme 🕊️

> **A gentle check-in for people who live independently.**  
> *One small tap lets the people who care about you know everything is okay.*

---

## 💡 The Simple Concept

Living alone offers freedom, but it also carries a quiet worry:  
**If an accident or medical emergency happens, how long before anyone realizes?**

Constant phone calls or check-in texts can feel intrusive and exhausting for both sides. **deadme** solves this with an empathetic, zero-friction automated safety net:

1. **One Tap a Day:** You open the app and tap a single button to confirm: *"I'm okay."*
2. **Silent Protection:** As long as you check in, nothing happens. Your day continues in total privacy.
3. **Smart Escalation:** If you miss a scheduled check-in, deadme doesn't panic. A gentle grace period begins with friendly reminders.
4. **Trusted Circle Alert:** If the grace period expires without a response, deadme alerts your designated caregivers and loved ones so they can step in.
5. **Secure Vault Delivery:** Confidential notes, emergency instructions, and vital information (stored with end-to-end client-side encryption) are delivered to your chosen recipients only if your full escalation plan triggers.

**deadme** transforms the traditional "dead man's switch" into a warm, dignified, daily peace-of-mind companion.

---

## 🎯 Target Audiences (Marketing Personas)

Use these segments to tailor your marketing campaigns, ad creatives, and landing pages:

| Persona | Pain Point | Core Marketing Angle |
|---|---|---|
| **Independent Solo Dwellers** (20s–40s) | Lives alone in apartments/cities; doesn't want overbearing daily calls from parents or friends. | *"Independence without isolation. Total privacy with a built-in safety net."* |
| **Aging Parents & Adult Children** (50s+) | Children worry about aging parents living alone; parents prize their autonomy and hate feeling like a burden. | *"Reassurance without nagging. Know mom or dad is safe every day with a single tap."* |
| **Solo Travelers & Adventurers** | Hiking, remote camping, solo road trips, or traveling abroad where danger is real. | *"Your automated emergency buddy when you're off the grid or traveling alone."* |
| **Digital Nomads & Solopreneurs** | Holds private passwords, crypto seeds, emergency documents, or business continuity keys. | *"Ensure your critical instructions reach the right people if you ever can't deliver them yourself."* |

---

## 📣 Marketing Campaign Hooks & Ad Copy

Ready-to-use hooks for Meta Ads, TikTok / Reels, Google Search, and X (Twitter):

### High-Impact Headlines
- **"Live independently. Never alone."**
- **"One tap a day. Infinite peace of mind."**
- **"If you didn't check in today, who would know?"**
- **"The safety net you never have to think about until you need it."**
- **"Say what matters most, when it matters most."**

### Short-Form Ad Copy (Social Ads)
> **Hook:** "Living alone is great—until you think about what happens if you slip, faint, or have an emergency."  
> **Body:** Meet **deadme**. One gentle tap every morning lets your system know you're alright. If you ever miss a check-in and grace period, your trusted circle is notified immediately, and your encrypted emergency messages are sent.  
> **CTA:** "Download deadme & set up your peace-of-mind circle today."

### Relational / Family Angle (Targeting Adult Children)
> **Hook:** "Stop the daily 'Are you alive?' texts to your aging parents."  
> **Body:** deadme lets them tap once every morning to confirm they're safe. No nagging, no loss of independence, just quiet reassurance for the whole family.  
> **CTA:** "Protect your loved ones with deadme."

---

## 🔑 Key Features

- 🟢 **One-Tap Daily Check-in:** Simple, satisfying haptic-backed tap that takes less than 2 seconds.
- ⏱️ **Customizable Cadence & Grace Periods:** Check in every 24 hours, 48 hours, or custom intervals, with customizable grace periods (e.g. 12h, 24h, 48h) before alerts fire.
- 👥 **Trusted Caregivers Circle:** Invite trusted friends, family, or neighbours who receive notifications if escalation triggers.
- 🔐 **End-to-End Encrypted Secret Messages:** Write personal letters, financial instructions, or emergency account access details.
  - **Zero-knowledge client encryption:** Encrypted using XSalsa20-Poly1305 (`tweetnacl`).
  - **Hardware keystore security:** Keys live exclusively in the device Keychain / Keystore (`expo-secure-store`). The backend database **never** sees plaintext messages.
- 💛 **Empathetic, Non-Morbid Design:** Soft pastel aesthetics, warm typography, and an encouraging mascot designed to bring calm rather than anxiety.

---

## 💎 Pricing & Plans

- **Free Tier:** 1 Caregiver · 1 Secret Message · Core check-in & reminder system.
- **Yearly Plan ($24.99/yr):** Up to 5 Caregivers · Unlimited encrypted messages · Best value for individuals.
- **Lifetime Plan ($59.99):** Complete peace of mind, forever.

---

## 🛠️ Technology Stack

- **Framework:** [Expo SDK 57](https://expo.dev) / [React Native 0.86](https://reactnative.dev)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Language:** TypeScript 6.0
- **Backend & Auth:** [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Auth)
- **State & Data Fetching:** TanStack React Query v5 & Zustand
- **Cryptography:** TweetNaCl (XSalsa20-Poly1305 authenticated encryption) + Expo SecureStore
- **Animations:** React Native Reanimated & Lottie

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js (v18+)
- npm or bun
- Expo Go or Expo Development Build on iOS / Android

### Installation

```bash
# Clone the repository
git clone https://github.com/adee-tharud/dedmeapp.git
cd deadme

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### Environment Setup
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running on Device / Simulator
- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan the QR code using Expo Go or your custom development client

---

## 🔒 Security & Privacy Promise

Security is deadme's core principle. Secret messages are encrypted on the user's phone before leaving the device. Even in the event of a database compromise, no third party or server administrator can read the contents of your messages.

For technical details, see [SECURITY.md](file:///Users/adeeshatharud/myworks/deadme/src/features/messages/SECURITY.md).
