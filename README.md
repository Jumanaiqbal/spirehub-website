# Spire Hub Website

A modern landing page for **Spire Hub** — Bahrain's startup incubator and coworking space.

Built with React, TypeScript, Tailwind CSS, and Framer Motion.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

## Deploying to Hostinger

See [deploy/HOSTINGER.md](deploy/HOSTINGER.md) for the full VPS setup guide
(PM2 + nginx + TLS). `npm run start` runs the production server
(`server/prod-server.ts`), which serves the built `dist/` output and the
`/api/*` backend from a single Node process.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — fast dev server and build tool
- **Tailwind CSS v4** — utility-first styling
- **Framer Motion** — scroll reveals, hover effects, carousels
- **Lucide React** — icons

## Sections

- Hero with CTAs
- Animated stats counter
- Feature highlights
- Mentors carousel
- Membership pricing plans
- Meeting room booking widget
- Events grid
- Testimonials slider
- CTA banner
- Footer with newsletter signup
