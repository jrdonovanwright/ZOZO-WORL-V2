// Navigation structure (Expo Router file-based)
//
// app/
//   (auth)/
//     login.tsx          — parent login
//     signup.tsx         — parent signup
//     child-select.tsx   — which child is playing today?
//   (child)/
//     index.tsx          — child home / Zoey greeting
//     subject/[id].tsx   — subject hub (reading, math, culture, science)
//     activity/[id].tsx  — individual activity screen
//     zoey.tsx           — free-talk mode with Zoey
//   (parent)/
//     dashboard.tsx      — progress overview
//     schedule.tsx       — session scheduling
//     subscription.tsx   — Stripe billing
//     settings.tsx       — account + child profiles
//   _layout.tsx          — root layout + auth gate
