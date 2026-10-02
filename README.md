# Daleel — HTML / CSS / JavaScript / Firebase

Arabic/English static tourism web app, using Firebase Authentication and Firestore. No React, Flutter, third-party app framework or application server. Existing project: `daleel-4838c`.

## Implemented operational flows

- Register creates Auth and a private UID-owned profile, signs out, then opens Login. First manual login opens onboarding. Login, Logout, reset password, verification email, auth state and protected views are implemented.
- Private editable profile: full name, email display, username (display alias, not globally unique), bio, city, mood and compressed JPEG photo. Images: JPEG/PNG/WebP up to 5 MB, compressed below 180,000 characters; no public Storage URL.
- Mood-dependent suggestions, bilingual destination details, less-travelled places, search/filter, embedded OpenStreetMap place view and Google Maps directions.
- Multiple private trips with names/dates, up to 14 days, draggable stops, keyboard-accessible move buttons, time/duration editing, conflict detection, approximate travel distance/time, actual map links, JSON export and planned/current/completed/archived states.
- Email-verified host application and private identity upload. Administrator manually reviews identity before approving a public host profile. Public host contact requires explicit consent. Hosts submit bilingual experiences for review.
- Approved hosts publish future slots with capacity and prices; can close a slot to new bookings. Closing does not cancel existing bookings. Slots cannot be reset to erase reservations.
- Real seat reservation through a Firestore transaction, with atomic rules validating price and capacity. Concurrent attempts cannot oversell the last seat. Travelers can cancel at least 48 hours before departure; hosts can cancel before departure. Cancellation releases seats; a cancelled slot can be rebooked as a new reservation.
- Pay on arrival in cash. No online charge, card collection or automated financial settlement. After the slot ends, each party can confirm only its own cash/visit confirmation. Post-visit reviews require both confirmations; only one review per booking.
- Spending and 10% community allocation use mutually confirmed bookings. Actual received community support uses administrator-reviewed transfer receipts. Allocated funds are not described as transferred. Goals progress uses received records only. No fictional hosts, bookings, reviews or funding is seeded.
- Administration: host/experience review, beneficiary-agreed goals and exact-amount contribution receipt registration. Receipt reference and identity documents stay private.
- Mobile four-icon navigation, RTL/LTR, visible focus, accessible errors/status, retry states, 404 page, privacy/cancellation terms, unsaved-trip and offline notices. This is not a fully offline app.

## Administrator

Sign in using `hamzaalfarraj16@gmail.com`, verify that account's email, refresh the verification status from Profile, then open `/Pages/admin.html`. Privilege is enforced in Firestore rules using the verified Auth email, not a client-side profile role. Changing the owner requires updating BOTH `JS/app/catalog.js` and `firestore.rules`. Do not grant administrator status by storing a user-editable `role`.

## Deployment (Windows)

1. Extract this project to a new directory. The directory containing `firebase.json` is the project root. Keep the prior deployed directory as a rollback copy.
2. From that root, use the already installed Firebase CLI and authenticated owner account:
   ```powershell
   firebase.cmd deploy --project daleel-4838c --only "hosting,firestore:rules"
   ```
   `deploy.cmd` runs the same command and keeps the result visible. If expired, run `firebase.cmd login` first.
3. Deploy rules AND Hosting together. Previous rules only permit profiles and will reject the new marketplace collections.
4. Open `https://daleel-4838c.web.app` in a fresh session, create an account, manually login, edit Profile, create/edit/reload a trip, Logout and Login again. Verify mobile/desktop rendering on actual devices.
5. For the first real experience: a host verifies their email and submits an application; the owner reviews identity, approves the host, approves an experience, and the host publishes a future slot. Check traveler reservation, host booking visibility and cancellation.

`firebase.json` excludes tests, credentials, config, documentation and deployment helpers. Source HTML/CSS/JS and images are the public website. Never upload a service account key, CLI token or password.

## Tests

Node 24+ and `npm install`, then `npm test`. For emulator integration, install Firebase CLI and Java (current CLI requires Java 21+), then `npm run test:rules`. CLI 13.35.1 + Java 17 was used in this session.

- 107 bilingual DOM render/form/navigation checks. Simulated DOM, not visual browser acceptance.
- 16 private-profile ownership/validation checks.
- 57 marketplace rules checks, including concurrent last-seat competition, private identity, host approval, price/capacity tampering, cancellation deadline, own cash confirmation, post-visit reviews and exact receipts.
- 10 actual app data-module integration checks against Auth + Firestore emulators: signup, manual Login, profile persistence, atomic reserve/cancel/rebook and complete paged reads.

## Important operational limits / document differences

This is a web implementation of the document's core concept, within the requested HTML/CSS/JS/Firebase restriction. It is not an unconditional guarantee of safety, uptime, legal compliance or readiness for every circumstance.

- Online card payments and automatic split payouts ARE NOT connected. They require a real payment-provider merchant account, payout contracts and trusted provider callbacks/backend (e.g. Firebase Functions). Client-only code cannot safely confirm payments. This version actually supports cash-on-arrival reservations instead of simulating a successful card charge.
- Government identity verification is NOT automated. Approved means administrator reviewed the submitted identity. Host permits, safety, availability and delivery must be checked operationally.
- Community transfers are NOT automated. Administrator must inspect genuine transfer evidence and beneficiary agreements; the code never invents proof of receipt.
- Map time is approximate, based on coordinates, not live traffic or a routing API. Users open actual Google Maps directions. Full offline maps, separate host mobile application and multiple payment gateways are not included.
- Existing profile and legacy `users.travelState` fields remain in Firestore. Legacy illustrative saved experiences are not promoted into real reservations or payment history. Older trip data is preserved but not automatically migrated to new `trips` documents.
- Do not publish real experiences until operator agreements, identity checks and local emergency/cancellation procedures are in place. Do not seed made-up data merely to fill an empty page.

## Session deployment status

This ZIP contains the new implementation. Firebase CLI in the execution environment has no authenticated account. Connected GitHub write attempt returned `403 Resource not accessible by integration`. Neither new Hosting deployment nor updated production rules has been performed from this session. The existing public URL serves the previously deployed version until the owner deploys this folder.

## Region/content update

Added seven less-travelled destinations (18 total), five proposed community projects, six editorial experience ideas and four explicitly fictional stories. Proposals are not active funded campaigns; ideas are not bookable inventory; stories are not user reviews. Saving a trip/place opens the Planned tab with the saved trip highlighted; changing state opens its corresponding tab and trips can return to Planned.
