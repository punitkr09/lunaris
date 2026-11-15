# LUNARIS: Copy-Paste Text for the Space Apps Project Form

Fill these into: spaceappschallenge.org → profile icon → **My Team** → **Project** tab → **Edit**.
Click **Save Progress** often. Replace every `[BRACKETED]` item first.

---

## Project Name

LUNARIS: Can We Land Here?

---

## High-Level Project Summary

LUNARIS is an interactive 3D web app that helps people evaluate landing sites at the Moon's South Pole. Users pick a site (including NASA's Artemis III candidate regions) and a landing date, then see whether the lander will have sunlight for power, a direct radio link to Earth and safe, gentle slopes, hour by hour across the mission. At the pole the Sun stays within about 1.5° of the horizon and Earth often sits behind crater ridges. Small changes in location or date can turn a good site into a dark, silent one. LUNARIS makes those trade-offs visible: it shows a 360° horizon panorama, a feasibility matrix that names the main limiting factor, and side-by-side comparisons of sites and dates. It is built on NASA Lunar Reconnaissance Orbiter imagery and elevation data. It matters because choosing where and when to land is one of the first and most important decisions for Artemis, and this tool lets students and planners explore that decision themselves.

---

## Link to Project Demo

[PASTE PUBLIC GOOGLE DRIVE LINK TO LUNARIS_Demo_7_Slides.pdf]

---

## Link to Final Project

[PASTE LIVE WEBSITE LINK, e.g. https://lunaris-xxxx.netlify.app]
(Optional second link in the Detailed Description: [GITHUB REPO LINK])

---

## Detailed Project Description

**What it does**
LUNARIS answers one question for any spot on the Moon: *Can we land here, and when?* For a chosen site and landing date it reports:
- **Power:** how many hours the Sun is visible above the local terrain, the expected solar-array output, and the longest stretch of darkness the lander must survive.
- **Communication:** when Earth is above the local ridge line for direct-to-Earth radio, with a link-budget estimate for S, X and Ka band.
- **Terrain:** surface slope against a 10° touchdown limit, elevation and distance to permanently shadowed regions.
- **Operational windows:** hours with both Sun and Earth contact, hours with only one, and complete blackout hours.
- **Confidence:** every number is labeled as measured, computed, assumed or proxy, so users know how far to trust it.

**How it works**
- A 3D Moon is rendered in the browser with Three.js / React Three Fiber, using 4K NASA LRO LROC color and LOLA elevation maps (NASA SVS #4720).
- An analytical ephemeris engine (Meeus / Delaunay series) computes the Sun and Earth positions seen from any lunar latitude and longitude, including libration and the finite size of the solar disc.
- A horizon model checks whether the Sun and Earth clear the surrounding ridges, hour by hour over 7 to 30 days.
- A Landing Window Scanner sweeps the next 30 landing dates and ranks them. A comparison view shows two sites or dates side by side, in plain language, with Markdown/JSON export and shareable links.
- 23 automated benchmark tests check the physics (coordinate transforms, Julian dates, solar time, Sun/Earth geometry, shadow cycles, solar power and radio path loss). All 23 pass.

**Benefits**
- Shows *why* a site is good or bad instead of hiding it behind a single score.
- Instantly answers "what if we land a week later?" or "what if we move 20 km?".
- Works in any modern browser with no install, so it can be used in classrooms.
- Honest about uncertainty: synthetic or approximated inputs are clearly labeled.

**What we hope to achieve**
We want to make lunar landing-site planning understandable to students and the public, and useful as a quick trade-study tool for mission concepts. Next steps are plugging in the 5 m/px LOLA South Pole elevation model and live SPICE/JPL Horizons ephemerides, adding rover traverse and Gateway relay planning, and building classroom activities.

**Tools and languages**
TypeScript, React 18, Vite, Three.js, React Three Fiber, drei, Tailwind CSS, GSAP, Lenis, Recharts, Node.js and esbuild (test runner). No special hardware.

---

## NASA Data

- **LRO LROC Wide Angle Camera global color mosaic** (via NASA Scientific Visualization Studio, CGI Moon Kit, SVS #4720): the surface texture of the 3D Moon. https://svs.gsfc.nasa.gov/4720
- **LRO LOLA laser altimetry elevation maps** (SVS #4720): 3D relief, surface normals and color-coded elevation. https://svs.gsfc.nasa.gov/4720
- **NASA JPL Horizons System API**: built-in query builder for Sun and Earth ephemerides. https://ssd.jpl.nasa.gov/horizons/
- **NASA Artemis III candidate South Pole landing regions**: reference landing sites. https://www.nasa.gov/artemis/
- **NASA imagery** (images.nasa.gov): LRO Earthrise, Artemis I Orion, Apollo 17 panorama, VIPER testing, Gateway, LRO NAC crater views and NASA artist's concepts of the Artemis lander and suits.

---

## Space Agency Partner Data and Other References

- Jean Meeus, *Astronomical Algorithms*, 2nd ed.: lunar ephemeris and libration equations.
- IAU Working Group on Cartographic Coordinates and Rotational Elements: Moon Mean Earth / Polar Axis (MOON_ME) frame.
- LOLA / PDS Geosciences Node: https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- Open-source libraries (MIT or similar licenses): React, TypeScript, Vite, Three.js, React Three Fiber, drei, Tailwind CSS, GSAP, Lenis, Recharts, lucide-react, esbuild.
- Fonts: Inter, Space Grotesk, JetBrains Mono (Google Fonts, SIL Open Font License).
- [If you used any Space Agency Partner data, such as ESA, JAXA, ISRO or CSA, list it here; otherwise delete this line.]
