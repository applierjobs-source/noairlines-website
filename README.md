# NoAirlines - Private Jet Charter Landing Page

A modern, responsive private jet charter landing page built with React, TypeScript, TailwindCSS, and Framer Motion.

## Features

- ⚛️ React 18 with TypeScript
- 🎨 TailwindCSS for styling
- ✨ Framer Motion for animations
- 🎯 shadcn/ui components
- 📱 Fully responsive design
- 🖼️ Smart image loading with fallbacks
- 🎭 Modern black, white & red color scheme

## Getting Started

### Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
NoAirlines/
├── src/
│   ├── components/
│   │   └── ui/           # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── input.tsx
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── index.html            # HTML entry point
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Features & Sections

- **Hero Section**: Eye-catching headline with animated elements
- **Booking Widget**: Quick quote request form
- **Fleet Cards**: 6 aircraft categories with smart image loading
- **Trust Ribbon**: Key service features
- **Destinations**: Popular city pairs
- **Safety Section**: Certifications and testimonials
- **Footer**: Company info with legal disclaimer

## Legal Notice

NoAirlines.com acts as an air charter broker and is not a direct air carrier. All flights are operated by FAA-certificated Part 135 air carriers who exercise full operational control of charter flights at all times.

## License

MIT
