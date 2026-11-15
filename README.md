# LUNARIS — Interactive Lunar South-Pole Exploration & Mission-Planning Platform

**Tagline:** *The Next Landing Starts With You.*  
**Core Mission Question:** *CAN WE LAND HERE?*  
**Challenge:** 2026 NASA Space Apps Challenge — Lunar South Pole Landing Site Evaluation

LUNARIS is a scientifically transparent, interactive 3D lunar exploration and mission-planning web application focused on the Lunar South Pole (`-90°S` to `+90°N`, `-180°W` to `+180°E`). Built with **React 18**, **TypeScript**, **Three.js / React Three Fiber**, **GSAP + Lenis**, **Recharts**, and **Tailwind CSS**, it combines a real **4K NASA Lunar Reconnaissance Orbiter (LRO)** 3D Moon, horizon-culled tactical HUD reticles, a **360° Local Horizon Panorama & Polar Sky Dome**, analytical selenographic orbital mechanics, a **Multi-Domain Feasibility Matrix**, rapid site-and-date trade studies, and 12 official archival NASA mission photographs.

---

## Table of Contents

1. [What We Built & Evolved (Feature Highlights)](#1-what-we-built--evolved-feature-highlights)
2. [Scientific Transparency & Epistemic Data Classification](#2-scientific-transparency--epistemic-data-classification)
3. [Website Experience & Chapter-by-Chapter User Guide](#3-website-experience--chapter-by-chapter-user-guide)
4. [Complete File-by-File Codebase Reference (Every File Explained)](#4-complete-file-by-file-codebase-reference-every-file-explained)
   - [4.1 Root Configuration & Build Files](#41-root-configuration--build-files)
   - [4.2 CLI Validation Runner (`scripts/`)](#42-cli-validation-runner-scripts)
   - [4.3 Public NASA Textures & Archival Photographs (`public/`)](#43-public-nasa-textures--archival-photographs-public)
   - [4.4 Application Entry, Styling & Root Orchestrator (`src/`)](#44-application-entry-styling--root-orchestrator-src)
   - [4.5 Domain Types & Data Contracts (`src/types/`)](#45-domain-types--data-contracts-srctypes)
   - [4.6 Physics, Orbital Mechanics & Validation Engine (`src/science/`)](#46-physics-orbital-mechanics--validation-engine-srcscience)
   - [4.7 Data Providers, Caching & Procedural Fallbacks (`src/services/` & `src/utils/`)](#47-data-providers-caching--procedural-fallbacks-srcservices--srcutils)
   - [4.8 Smooth Scrolling & Editorial Motion Stages (`src/motion/`)](#48-smooth-scrolling--editorial-motion-stages-srcmotion)
   - [4.9 3D WebGL / React Three Fiber Scene Engine (`src/components/scene/`)](#49-3d-webgl--react-three-fiber-scene-engine-srccomponentsscene)
   - [4.10 Mission Planning & Visualisation UI Components (`src/components/`)](#410-mission-planning--visualisation-ui-components-srccomponents)
5. [23 Automated Scientific Validation Benchmarks](#5-23-automated-scientific-validation-benchmarks)
6. [Getting Started, Commands & Verification](#6-getting-started-commands--verification)
7. [Data Sources, Credits & References](#7-data-sources-credits--references)

---

## 1. What We Built & Evolved (Feature Highlights)

1. **Interactive 4K NASA LRO 3D Moon with Tactical HUD Reticles**:
   - Real 4K (`4096×2048`) **NASA GSFC SVS #4720** LROC Wide Angle Camera (WAC) albedo and LRO LOLA laser altimetry displacement/normal/hypsometric maps on a 256×256-segment `MOON_ME` sphere.
   - **Hemisphere Horizon Occlusion Culling**: Every 3D marker and cartographic label computes `surfaceNormal.dot(cameraDirection)` per frame so far-side and opposite-hemisphere labels never bleed through the solid Moon sphere.
   - **Anti-Clutter Polar Reticle System**: Candidate sites render as flush surface-tangent concentric reticles (`ringGeometry` + bullseye pinpoint) aligned to the local surface normal. Clustered South Pole sites (`< -82°S`) stay de-cluttered and expand into a full **NASA Tactical Telemetry Callout** on hover or close zoom, while the active site displays a rotating crosshair, radar pulse ring, and `TARGET LOCK` HUD card with 3D directional Sun (`☉`) and Earth (`⊕`) sightline arrows.
   - **Quick Target Lock Strip**: One-click target locking inside the top-left 3D viewport HUD (`SP-01`, `SP-02`, `SP-03`, `SP-04`, `SP-05`, `SP-06`) alongside `Global Sphere` / `Local Relief` mode switching.

2. **Signature Local 360° Horizon Panorama & Temporal Sky Dome (`#stage-sky`)**:
   - **A. Local Sky View**: Switch between a **360° Topographic Horizon Panorama** (`N–E–S–W–N`) and a **Polar Sky Dome** (`Zenith 90°` center), plotting live Sun and Earth positions, multi-day sky tracks, the `0°` geometric horizon vs. the 36-bin LOLA terrain ridge mask (`±1.5°` uncertainty band), and live countdowns to Sunrise/Sunset and Earthrise/Earthset.
   - **B. Temporal Sky View**: Synchronized operational readiness bar (`Sun + Direct Comm`, `Sun + No Direct Comm`, `Shadow + Direct Comm`, `Shadow + No Comm`), time scrubber (`T+0h` to `T+720h`), play/pause/speed controls, and one-click jumps to **Solar Noon (`12:00 LTST`)**, **Next Sunrise/Sunset**, and **Earthrise/Earthset** events.

3. **Multi-Domain Mission Feasibility & Constraint Matrix (`#stage-feasibility`)**:
   - Answers *"CAN WE LAND HERE?"* without reducing complex engineering trade-offs to an unexplained single score.
   - Evaluates **1. Power Feasibility**, **2. Comm Feasibility**, **3. Terrain Constraints**, **4. Temporal Operational Windows** (Simultaneous Sun+DTE vs. Dual Blackout), **5. Scientific Data Confidence & Epistemic Provenance** (`MEASURED`, `COMPUTED`, `ASSUMED`, `PROXY`), and highlights the **Primary Limiting Factor**.

4. **Optional Surface Asset & Rover Compatibility What-If Lab**:
   - Clearly badged as `Optional Mission Extension · HYPOTHETICAL SIMULATION` (visible in `EXPLORER` and `MISSION_PLANNER` modes).
   - Evaluates 4 hardware envelopes (*Crewed Polar Lander*, *Commercial Robotic CLPS Lander*, *VIPER-Class Volatile Rover*, *RTG-Assisted PSR Rover*) with interactive battery survival (`12h–360h`) and max slope (`5°–20°`) sliders against the active site's computed environment.

5. **Rapid Site & Date Trade-Study Comparison (`#stage-comparison`)**:
   - Directly answers *"If my landing location or date changes, how does my mission environment change?"*
   - Includes 5 one-click trade-study presets (*1. Different Site · Same Date*, *2. Same Site · +7d Delay*, *3. Same Site · +14d Lunar Flip*, *4. Same Site · +29.5d Next Cycle*, *5. Alt Site & +14d Shift*), a **Natural-Language Mission Environment Delta Banner**, synchronized Alpha vs. Bravo readiness bars, sunrise/sunset/Earthrise/Earthset event counts, snapshot saving, and Markdown/JSON export.

6. **NASA.gov Archival Photography & Multimedia Lightbox (`#stage-nasa-gallery`)**:
   - 12 official public-domain NASA photographs (`public/images/nasa/*.jpg`) with authentic NASA Archive IDs (`GSFC_20171208_Archive_e000496`, `NASA-JSC-CEB_1528`, `NASA-ART001E001822`, `KSC-20240716-PH-NAS01_0002`, `GRC-2022-C-04467`, etc.) integrated across chapter backdrops, question cards, feasibility pillars, hardware cards, and an interactive **Split-Screen NASA Multimedia Spotlight & Full-Screen Lightbox**.

7. **3-Tier Progressive Disclosure & Timeline Memoization**:
   - Switch between **Guided** (`EDUCATOR`), **Explorer** (`EXPLORER`), and **Planner** (`MISSION_PLANNER`) modes in the top header bar.
   - Multi-day timeline bundles are memoized in `SimulatedLunarProvider.ts` (`timelineCache`) so scrubbing or playing Mission Elapsed Time (`T+h`) runs at 60 FPS without recomputing the 336-step horizon loop on every tick.

---

## 2. Scientific Transparency & Epistemic Data Classification

LUNARIS strictly separates real spacecraft measurements and validated orbital mechanics from synthetic approximations:

| Classification | Scope in LUNARIS | Details |
| :--- | :--- | :--- |
| **`REAL_DATA`** | **Global 3D Moon Imagery & Elevation** | 4K (`4096×2048`) equirectangular maps in `public/textures/` derived from **NASA GSFC SVS #4720 (CGI Moon Kit)**: LRO LROC Wide Angle Camera (WAC) Hapke Normalized Mosaic + LRO LOLA 16 px/deg Digital Elevation Model (`ldem_16_uint`). |
| **`REAL_DATA`** | **Selenographic Coordinates & Ephemeris Math** | `MOON_ME` (Mean Earth / Polar Axis, `R = 1,737.4 km`) coordinate transforms, Julian Date (`JD`), Lunar Local True Solar Time (`LTST`), analytical Delaunay Sun/Earth positions, optical libration, finite solar disc grazing (`R_☉ = 0.266°`), photovoltaic cosine incidence, and RF Free-Space Path Loss (`FSPL`). |
| **`REAL_DATA`** | **Candidate Landing Site Coordinates & Archival Photos** | 11 published NASA Artemis III / Apollo / Chang'e-4 / IAU Gazetteer reference sites (`REAL_NASA_REFERENCE`) and 12 public-domain NASA archival photographs (`public/images/nasa/`). |
| **`SYNTHETIC_DATA`** | **Local 360° Horizon Masks, Local Terrain Patch & NRHO Relay** | Local 360° ridge horizon profiles, `LocalTerrainPatch` meshes, the `SYNTH-TEST-09` stress-test site (`ILLUSTRATIVE_SYNTHETIC`), and optional NRHO relay availability use deterministic parametric models (`±1.5°` horizon uncertainty). |
| **`UNAVAILABLE_DATA`** | **Full-Resolution LOLA 5 m/px DEM & Live SPICE** | `LDEM_80S_5M` (`~1.8 GB` GeoTIFF) and NAIF SPICE kernels (`de440.bsp`) are not bundled in the browser; integration hooks and a live JPL Horizons REST query builder are included. |

---

## 3. Website Experience & Chapter-by-Chapter User Guide

- **Sticky Header Bar (`HeaderTelemetryBar`)**: Displays active coordinates, solar elevation, Earth DTE status, chapter navigation pills (`1. 3D Moon`, `2. 4 Regions`, `3. Site & Time`, `4. Timeline`, `5. Compare`, `6. NASA Data`, `7. Verify`), the 3-level Experience Mode selector (**Guided / Explorer / Planner**), **Expand All Answers**, and **Data & About**.
- **Opening Hero (`HeroBigTextStage`)**: Full-bleed NASA LRO Earthrise backdrop with the core question (*"CAN WE LAND HERE?"*), quick-jump CTAs, and 3 interactive Curiosity Briefing photo cards.
- **Chapter 01 (`#stage-globe`, `#stage-sky`, `#stage-feasibility`)**:
  - **Interactive 3D Moon (`Moon3DViewport`)** + **Question-First Site Q&A Rail (`NasaSiteQuestionRail`)**.
  - **Signature Local 360° Horizon Panorama & Temporal Sky View (`LocalTemporalSkyView`)**.
  - **Multi-Domain Mission Feasibility & Constraint Matrix (`MissionFeasibilitySummary`)**.
  - **Surface Asset & Rover Compatibility What-If Lab (`MissionExtensionsLab`)**.
- **Chapter 02 (`#stage-expedition`, `#stage-nasa-gallery`)**:
  - **4 Extreme Worlds on One Moon (`LunarExpeditionRibbon`)** + **NASA Archival Multimedia & Lightbox Showcase (`NasaMissionGallerySection`)**.
- **Chapter 03 (`#stage-controls`)**: **Location Selection (`LandingSiteSelector`)** & **Mission Time / Schedule Slip Controls (`EpochTimeControls`)**.
- **Chapter 04 (`#stage-timeline`)**: **Hour-by-Hour Mission Timeline & Elevation Chart (`MissionTimelinePanel`)**.
- **Chapter 05 (`#stage-comparison`)**: **Head-to-Head Site & Date Comparison (`ScenarioComparisonView`)**.
- **Chapter 06 (`#stage-architecture`)**: **Scientific Data Pipeline, Provenance & JPL Horizons Query Builder (`DataArchitectureView`)**.
- **Chapter 07 (`#stage-validation`)**: **16 Automated Physics & Orbital Mechanics Validation Benchmarks (`ScientificValidationView`)**.

---

## 4. Complete File-by-File Codebase Reference (Every File Explained)

### 4.1 Root Configuration & Build Files

| File | Purpose & Technical Details |
| :--- | :--- |
| [`package.json`](package.json) | Defines project metadata (`lunaris-mission-control@0.1.0`), scripts (`dev`, `build`, `preview`, `test`), and dependencies (`react`, `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `lenis`, `recharts`, `lucide-react`, `tailwindcss`). |
| [`package-lock.json`](package-lock.json) | Locked dependency tree ensuring reproducible installations across environments. |
| [`vite.config.ts`](vite.config.ts) | Vite 5 configuration with `@vitejs/plugin-react` and manual Rollup chunk splitting (`vendor-three`, `vendor-charts`, `vendor-motion`) to optimize bundle loading. |
| [`tsconfig.json`](tsconfig.json) | Strict TypeScript compiler configuration (`strict: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `target: "ES2020"`). |
| [`tsconfig.node.json`](tsconfig.node.json) | TypeScript configuration scoped to `vite.config.ts`. |
| [`tailwind.config.js`](tailwind.config.js) | Tailwind CSS theme configuration defining custom `space-*` and `lunar-*` color palettes, `font-display` / `font-sans` / `font-mono` stacks, and tight letter-spacing tokens. |
| [`postcss.config.js`](postcss.config.js) | PostCSS pipeline running `tailwindcss` and `autoprefixer`. |
| [`index.html`](index.html) | HTML5 entry point loading Google Fonts (`Inter`, `Space Grotesk`, `JetBrains Mono`) and mounting `#root` via `/src/main.tsx`. |
| [`moon.obj`](moon.obj) | Standalone Wavefront 3D mesh asset preserved in the repository root for external 3D reference. |

---

### 4.2 CLI Validation Runner (`scripts/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`scripts/run-validation.mjs`](scripts/run-validation.mjs) | Node.js test runner invoked by `npm.cmd test`. Bundles `src/science/validationSuite.ts` (and its `lunarMath.ts` / `SimulatedLunarProvider.ts` imports) on the fly with `esbuild`, executes all 23 scientific benchmarks (`runScientificValidationSuite()`), prints formatted pass/fail tolerances to stdout, and exits with code `0` only if every benchmark passes. |

---

### 4.3 Public NASA Textures & Archival Photographs (`public/`)

#### 4K Global Lunar Maps (`public/textures/`)
| File | Size | Source & Role in 3D Scene |
| :--- | :--- | :--- |
| [`public/textures/lroc_color_4k.jpg`](public/textures/lroc_color_4k.jpg) | `2.46 MB` | `4096×2048` NASA LRO LROC Wide Angle Camera (WAC) Hapke-normalized global color albedo map (`SRGBColorSpace`), used in `GlobalMoonSphere.tsx` (`REGOLITH_ALBEDO` shader mode). |
| [`public/textures/lola_hypsometric_4k.jpg`](public/textures/lola_hypsometric_4k.jpg) | `4.49 MB` | `4096×2048` NASA LRO LOLA color-coded hypsometric elevation map (`SRGBColorSpace`), used when toggled to `LOLA_HYPSOMETRIC` mode in `GlobalMoonSphere.tsx`. |
| [`public/textures/lola_disp_4k.jpg`](public/textures/lola_disp_4k.jpg) | `1.17 MB` | `4096×2048` NASA SVS #4720 LRO LOLA 16 px/deg digital elevation displacement map (`LinearSRGBColorSpace`), driving real 3D vertex displacement and micro-bump relief on the lunar sphere. |
| [`public/textures/lola_normal_4k.jpg`](public/textures/lola_normal_4k.jpg) | `5.38 MB` | `4096×2048` tangent-space normal map (`LinearSRGBColorSpace`) derived from LRO LOLA laser altimetry for crisp grazing terminator shadows across crater walls. |

#### Official NASA Archival Photographs (`public/images/nasa/`)
| File | NASA Archive ID | Official Credit & Subject |
| :--- | :--- | :--- |
| [`public/images/nasa/lro_earthrise.jpg`](public/images/nasa/lro_earthrise.jpg) | `GSFC_20171208_Archive_e000496` | NASA / GSFC / ASU — High-resolution LRO Narrow Angle Camera Earthrise over the lunar limb. |
| [`public/images/nasa/artemis3_polar_lighting_sim.jpg`](public/images/nasa/artemis3_polar_lighting_sim.jpg) | `NASA-JSC-CEB_1528` | NASA / Johnson Space Center — Engineers simulating low-angle polar grazing sunlight and shadows for Artemis III. |
| [`public/images/nasa/artemis1_orion_earth_moon.jpg`](public/images/nasa/artemis1_orion_earth_moon.jpg) | `NASA-ART001E001822` | NASA — Artemis I Flight Day 13: Orion solar array looking back at the Moon and Earth line-of-sight. |
| [`public/images/nasa/artemis3_hls_surface.jpg`](public/images/nasa/artemis3_hls_surface.jpg) | Artist's concept | NASA / SpaceX — Artist's concept of the Starship Human Landing System on the Moon. |
| [`public/images/nasa/artemis3_astronauts_south_pole.jpg`](public/images/nasa/artemis3_astronauts_south_pole.jpg) | Artist's concept | NASA / Axiom Space — Artist's concept of astronauts in Artemis III surface suits. |
| [`public/images/nasa/lro_spacecraft_orbit.jpg`](public/images/nasa/lro_spacecraft_orbit.jpg) | `NASA-JPL-PIA18163` | NASA / GSFC / JPL — Lunar Reconnaissance Orbiter (LRO) in polar mapping orbit. |
| [`public/images/nasa/lro_lunar_highlands_oblique.jpg`](public/images/nasa/lro_lunar_highlands_oblique.jpg) | `NASA-JPL-PIA12885` | NASA / GSFC / ASU — LRO Narrow Angle Camera oblique view swooping over lunar highland plateaus. |
| [`public/images/nasa/lro_crater_peak_scarp.jpg`](public/images/nasa/lro_crater_peak_scarp.jpg) | `NASA-JPL-PIA13132` | NASA / GSFC / ASU — LRO NAC high-resolution view of steep crater scarps and boulder fields. |
| [`public/images/nasa/lro_farside_crater_roi.jpg`](public/images/nasa/lro_farside_crater_roi.jpg) | `NASA-JPL-PIA13059` | NASA / GSFC / ASU — LRO far-side crater complex inside the South Pole–Aitken Basin. |
| [`public/images/nasa/gateway_nrho_orbit.jpg`](public/images/nasa/gateway_nrho_orbit.jpg) | `KSC-20240716-PH-NAS01_0002` | NASA / Kennedy Space Center — Lunar Gateway station in Polar Near-Rectilinear Halo Orbit (NRHO). |
| [`public/images/nasa/viper_rover_slope_lab.jpg`](public/images/nasa/viper_rover_slope_lab.jpg) | `GRC-2022-C-04467` | NASA / Glenn Research Center — VIPER polar volatile rover in the SLOPE terrain traction lab. |
| [`public/images/nasa/apollo17_surface_panorama.jpg`](public/images/nasa/apollo17_surface_panorama.jpg) | `NASA-JSC2004E52772` | NASA / Johnson Space Center — Apollo 17 Taurus-Littrow lunar surface panorama. |

---

### 4.4 Application Entry, Styling & Root Orchestrator (`src/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/main.tsx`](src/main.tsx) | React 18 root bootstrapper mounting `<App />` inside `<React.StrictMode>`. |
| [`src/index.css`](src/index.css) | Global CSS design system defining deep-space navy/black surfaces (`#030509`, `#0c111c`), electric-blue (`#38bdf8`) and solar-amber (`#f59e0b`) accents, glassmorphism utility classes (`.lunaris-glass`, `.lunaris-glass-panel`, `.lunaris-surface`, `.nasa-card`, `.nasa-card-interactive`, `.nasa-eyebrow`), and custom scrollbar/keyframe animations. |
| [`src/App.tsx`](src/App.tsx) | Top-level application state orchestrator and continuous single-scroll expedition layout (`ContinuousScrollBody`). Manages Scenario Alpha & Scenario Bravo coordinates/epochs/durations, elapsed time playback (`isPlaying`, `playbackSpeed`, `elapsedHours`), solar & RF hardware configs, pinned comparison sites, saved snapshots, Experience Mode (`EDUCATOR` / `EXPLORER` / `MISSION_PLANNER`), live validation suite execution (`runScientificValidationSuite()`), and IntersectionObserver chapter tracking. |

---

### 4.5 Domain Types & Data Contracts (`src/types/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/types/navigation.ts`](src/types/navigation.ts) | Single source of truth for all TypeScript interfaces and union types across LUNARIS: `DataClassification` (`REAL_DATA`, `SYNTHETIC_DATA`, `UNAVAILABLE_DATA`), `UserExperienceMode` (`EDUCATOR`, `EXPLORER`, `MISSION_PLANNER`), `LunarCoordinates`, `LandingSitePreset`, `SolarHardwareConfig`, `CommHardwareConfig`, `MissionTimeConfig`, `SunTelemetry`, `EarthTelemetry`, `HorizonTransitionEvent`, `TimelineTelemetryPoint`, `MissionSummaryMetrics` (including `nominalOpsHours`, `solarOnlyHours`, `eclipseDteHours`, `criticalBlackoutHours`, `sunriseCount`, `sunsetCount`, `earthriseCount`, `earthsetCount`), `MissionScenarioData`, and `ValidationBenchmarkResult`. |

---

### 4.6 Physics, Orbital Mechanics & Validation Engine (`src/science/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/science/lunarMath.ts`](src/science/lunarMath.ts) | Pure analytical selenographic physics engine containing zero UI dependencies:<br>• `MOON_MEAN_RADIUS_KM = 1737.4`, `SOLAR_CONSTANT_WM2 = 1361.0`, `SOLAR_ANGULAR_RADIUS_DEG = 0.266`<br>• `lunarLatLonToCartesian3D()` & `cartesian3DToLunarLatLon()`: IAU `MOON_ME` spherical-to-3D transforms (`+Y` North Pole, `+Z` Prime Meridian toward Earth, `+X` `90°E`).<br>• `selenographicGreatCircleDistanceKm()`: Haversine great-circle surface distance.<br>• `utcMsToJulianDate()` & `julianDateToJ2000Centuries()`: IAU Julian Date conversions.<br>• `computeAnalyticalSelenographicEphemeris()`: Computes sub-solar `(lat, lon)`, sub-Earth optical libration `(lat, lon)`, Earth-Moon distance (`km`), and one-way light time (`sec`) using Meeus / JPL Delaunay arguments.<br>• `computeLunarLocalSolarTimeHours()`: Computes Lunar Local True Solar Time (`0.0–24.0 LTST`, where `12.0` is local solar noon).<br>• `computeTopocentricHorizontal()`: Transforms sub-body coordinates into local topocentric `elevationDeg`, `azimuthDeg` (`0°=N, 90°=E, 180°=S, 270°=W`), and 3D ENU unit vector.<br>• `computeVisibleSolarDiscFraction()`: Finite solar disc (`R_☉ = 0.266°`) circular segment integration across the local terrain ridge horizon.<br>• `computeSolarArrayPerformance()`: Vector dot-product incidence angle, cosine efficiency, Plane-of-Array irradiance (`W/m²`), electrical output (`W_e`), and `±1.5°` horizon uncertainty bounds.<br>• `computeRfLinkBudget()`: Parabolic dish gain (`dBi`), Free-Space Path Loss (`FSPL`), link margin (`dB`), and data rate (`Mbps`) for S/X/Ka bands. |
| [`src/science/validationSuite.ts`](src/science/validationSuite.ts) | Implements `runScientificValidationSuite()`, running 23 automated verification benchmarks across all 10 physics domains (including Apollo 11 historical libration/elevation fixtures, East-rise/West-set azimuth conventions, polar vertical-mast vs. flat-panel cosine law, and 28-day window conservation). |

---

### 4.7 Data Providers, Caching & Procedural Fallbacks (`src/services/` & `src/utils/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/services/LunarDataProvider.ts`](src/services/LunarDataProvider.ts) | Defines the `ILunarNavigationProvider` interface (`getMetadata()`, `getCandidateLandingSites()`, `getScenarioData()`) so analytical simulation and external NASA SPICE/Horizons adapters are interchangeable. |
| [`src/services/SimulatedLunarProvider.ts`](src/services/SimulatedLunarProvider.ts) | Primary data provider containing the 12 curated lunar sites (6 Artemis III South Pole candidates, 2 historic near-side sites, 2 far-side sites, 1 equatorial mare site, and 1 synthetic stress-test site), 36-azimuth parametric horizon generator, multi-day timeline simulator, sunrise/sunset/Earthrise/Earthset transition detector, transparent viability score breakdown, and `timelineCache` memoization (`Map<string, CachedTimelineBundle>`). |
| [`src/services/NasaHorizonsSpiceAdapterStub.ts`](src/services/NasaHorizonsSpiceAdapterStub.ts) | Adapter demonstrating how live NASA JPL Horizons REST API (`https://ssd.jpl.nasa.gov/api/horizons.api`) and LOLA PDS4 GeoTIFF rasters plug into `ILunarNavigationProvider`. |
| [`src/utils/lunarTextureGenerator.ts`](src/utils/lunarTextureGenerator.ts) | Generates deterministic fallback canvas textures (`albedoMap`, `bumpMap`, `hypsometricMap`) if offline/network conditions prevent loading the 4K `/textures/*.jpg` files. |

---

### 4.8 Smooth Scrolling & Editorial Motion Stages (`src/motion/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/motion/SmoothScrollProvider.tsx`](src/motion/SmoothScrollProvider.tsx) | Initializes **Lenis** smooth inertial scrolling synchronized with **GSAP ScrollTrigger**, respects `prefers-reduced-motion`, renders the top scroll-progress bar, and exports `<ScrollReveal>` and `useSmoothScroll()`. |
| [`src/motion/HeroBigTextStage.tsx`](src/motion/HeroBigTextStage.tsx) | Renders the full-bleed opening hero stage (*"WHERE THE SUN NEVER SETS—AND NEVER RISES"*, *"CAN WE LAND HERE?"*, *"The Next Landing Starts With You."*) with NASA LRO Earthrise imagery and 3 interactive Curiosity Briefing photo cards. |
| [`src/motion/BigTextChapterTransition.tsx`](src/motion/BigTextChapterTransition.tsx) | Monumental chapter transition divider combining full-bleed NASA archival photography (`backgroundVariant`), GSAP-scrubbed opposing kinetic typography rails, chapter eyebrows, and telemetry tags. |

---

### 4.9 3D WebGL / React Three Fiber Scene Engine (`src/components/scene/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/components/scene/types.ts`](src/components/scene/types.ts) | Shared 3D scene constants (`MOON_SPHERE_RADIUS = 2.35`, `INITIAL_CAMERA_POSITION = [0, -3.4, 5.2]`, `LOCAL_PATCH_METERS_PER_UNIT = 300`) and types (`CameraPreset`, `CameraChoreographyRequest`, `MoonViewMode`, `SceneQualityMode`, `SurfaceShaderMode`). |
| [`src/components/scene/LunarSceneCanvas.tsx`](src/components/scene/LunarSceneCanvas.tsx) | Pure React Three Fiber `<Canvas>` wrapped in `SceneErrorBoundary`. Configures ACES Filmic tone mapping, starfield, sub-solar directional sunlight (`castShadow`), sub-Earth libration Earthshine fill light, and switches between `GlobalMoonSphere` and `LocalTerrainPatch`. |
| [`src/components/scene/GlobalMoonSphere.tsx`](src/components/scene/GlobalMoonSphere.tsx) | Renders the 3D Moon sphere using the 4K NASA SVS #4720 LROC & LOLA textures (`lroc_color_4k.jpg`, `lola_hypsometric_4k.jpg`, `lola_disp_4k.jpg`, `lola_normal_4k.jpg`), anisotropic filtering, and interactive surface raycasting (`onDoubleClick` / `onClick` to select any `(Lat, Lon)` on the Moon). |
| [`src/components/scene/CameraController.tsx`](src/components/scene/CameraController.tsx) | Manages `OrbitControls` with smooth damping (`dampingFactor = 0.065`), gentle orbital spin (`autoRotate`), and spherical-interpolated camera transitions (`SOUTH_POLE`, `TARGET_FOCUS`, `OVERVIEW_SOUTH`, `NEARSIDE_0`, `FARSIDE_180`). |
| [`src/components/scene/GlobalSphericalGraticule.tsx`](src/components/scene/GlobalSphericalGraticule.tsx) | Renders 3D latitude parallels (`-85°S` Artemis polar circle, `0°` equator, etc.) and longitude meridians (`0°` sub-Earth, `180°` far-side) with **horizon-culled cartographic coordinate labels** (`HorizonCulledGraticuleLabel`) that fade out when rotated toward the limb. |
| [`src/components/scene/MissionOverlays.tsx`](src/components/scene/MissionOverlays.tsx) | Precision 3D tactical HUD overlay layer:<br>• `CandidateSiteNode`: Flush surface-tangent reticle rings + bullseye pinpoints with hemisphere occlusion culling (`facingDot < 0.18`) and polar anti-clutter logic (sites within `12°` of active target or `< -82°S` expand only on hover or close zoom).<br>• Active Target Lock Reticle: Rotating segmented crosshair, radar pulse ring, and `TARGET LOCK` HUD telemetry card.<br>• Directional Sun (`☉`) and Earth (`⊕`) sightline vectors with 3D arrowhead cones (`coneGeometry`). |
| [`src/components/scene/LocalTerrainPatch.tsx`](src/components/scene/LocalTerrainPatch.tsx) | Synthetic 3D local topographic relief mesh (`sampleLocalPatchHeight`) with concentric `25m` inner and `100m` outer HLS touchdown safety rings, vertical lander mast, and local ENU Sun/Earth rays. |

---

### 4.10 Mission Planning & Visualisation UI Components (`src/components/`)

| File | Purpose & Technical Details |
| :--- | :--- |
| [`src/components/HeaderTelemetryBar.tsx`](src/components/HeaderTelemetryBar.tsx) | Sticky top navigation bar with live telemetry pills, chapter scroll buttons, 3-level Experience Mode selector (`Guided`, `Explorer`, `Planner`), `Expand All` toggle, and the `Data & About` provenance modal. |
| [`src/components/Moon3DViewport.tsx`](src/components/Moon3DViewport.tsx) | UI frame around `LunarSceneCanvas` providing the top-left site identity card, the **Quick Target Lock** strip (`SP-01` through `SP-06`), `Global Sphere` / `Local Relief` switcher, `Layers` optical popover, and bottom camera preset dock. |
| [`src/components/NasaSiteQuestionRail.tsx`](src/components/NasaSiteQuestionRail.tsx) | Question-driven right rail beside the 3D Moon with NASA archival photo headers for **Question 01 (Sunlight & Solar Energy)**, **Question 02 (Direct-to-Earth Communication)**, and **Question 03 (Surface Slope & Touchdown Safety)**. |
| [`src/components/NasaQuestionDrawerCard.tsx`](src/components/NasaQuestionDrawerCard.tsx) | Reusable progressive-disclosure drawer card pairing a NASA archival image plate, plain-language short answer, key takeaway metric badge, and expandable deep-dive engineering workspace. |
| [`src/components/NasaLunarImagePlate.tsx`](src/components/NasaLunarImagePlate.tsx) | Renders any of the 12 official NASA archival image variants (`NASA_IMAGE_CONFIGS`) with optical reticle framing, category badge, `ID: <NASA_ARCHIVE_ID>` chip, and NASA center credit. |
| [`src/components/NasaMissionGallerySection.tsx`](src/components/NasaMissionGallerySection.tsx) | Interactive **NASA Multimedia Archive & Lightbox Showcase** (`#stage-nasa-gallery`) featuring a split-screen "Image of the Mission" spotlight, an 8-card thumbnail selector strip, physics-engine integration callouts, and a full-screen archival inspection modal. |
| [`src/components/LocalTemporalSkyView.tsx`](src/components/LocalTemporalSkyView.tsx) | Signature **Local 360° Horizon Panorama + Polar Sky Dome** and **Temporal Sky View** (`#stage-sky`), plotting Sun & Earth tracks, `0°` geometric horizon vs. 36-bin terrain ridge mask (`±1.5°` uncertainty band), countdowns, readiness bar, time scrubber, and one-click event jump buttons. |
| [`src/components/MissionFeasibilitySummary.tsx`](src/components/MissionFeasibilitySummary.tsx) | **Multi-Domain Mission Feasibility & Constraint Matrix** (`#stage-feasibility`) evaluating Power, Comm, Terrain, Temporal Windows, Epistemic Provenance, and the Primary Limiting Factor. |
| [`src/components/MissionExtensionsLab.tsx`](src/components/MissionExtensionsLab.tsx) | **Surface Asset & Rover Compatibility What-If Lab** (`HYPOTHETICAL SIMULATION`) comparing 4 lander/rover hardware profiles with interactive battery and slope sliders against the active site. |
| [`src/components/SunElevationPanel.tsx`](src/components/SunElevationPanel.tsx) | Detailed solar physics panel with 2D horizon cross-section SVG, solar disc grazing fraction, and interactive solar array hardware configurator (tracking mode, panel tilt, azimuth, area `m²`, cell efficiency `%`). |
| [`src/components/EarthVisibilityPanel.tsx`](src/components/EarthVisibilityPanel.tsx) | Detailed RF communications panel with optical libration coordinates, Earthrise/Earthset countdowns, DSN station tracking, and RF hardware configurator (`S / X / Ka` band, dish diameter, min elevation, and `HYPOTHETICAL RELAY SIMULATION` toggle). |
| [`src/components/TerrainSummaryCard.tsx`](src/components/TerrainSummaryCard.tsx) | Topographic summary card displaying `MOON_ME` datum elevation, mean slope hazard against the `10°` HLS touchdown limit, PSR cold-trap distance, and 360° horizon obstruction range. |
| [`src/components/LunarExpeditionRibbon.tsx`](src/components/LunarExpeditionRibbon.tsx) | Guided 4-region selenographic spotlight comparing **Shackleton Ridge**, **Malapert Massif**, **Mons Mouton**, and **Von Kármán Crater (Far Side)** with one-click 3D camera locking. |
| [`src/components/LandingSiteSelector.tsx`](src/components/LandingSiteSelector.tsx) | Searchable, filterable catalog of all 12 lunar sites with region tabs, multi-site `Compare` pin toggles, and custom `(Latitude, Longitude)` numeric input. |
| [`src/components/EpochTimeControls.tsx`](src/components/EpochTimeControls.tsx) | UTC landing epoch picker, Artemis window presets, schedule delay/advance buttons (`-7d`, `-1d`, `+1d`, `+7d`, `+14d Lunar Flip`, `+29.5d Next Cycle`), stay duration selector (`7d`, `14d`, `28d`, `30d`), and `T+h` playback controls. |
| [`src/components/MissionTimelinePanel.tsx`](src/components/MissionTimelinePanel.tsx) | Hour-by-hour operational readiness bar, Recharts solar/Earth ridge clearance chart, and clickable Sunrise/Sunset/Earthrise/Earthset event pills. |
| [`src/components/ScenarioComparisonView.tsx`](src/components/ScenarioComparisonView.tsx) | Head-to-head Scenario Alpha vs. Scenario Bravo comparison matrix with 5 one-click Rapid Trade-Study Presets, Natural-Language Mission Environment Delta Banner, synchronized readiness bars, score derivation, snapshot saving, and `.md` / `.json` export. |
| [`src/components/DataArchitectureView.tsx`](src/components/DataArchitectureView.tsx) | Dataset provenance manifest (`REAL_DATA`, `SYNTHETIC_DATA`, `UNAVAILABLE_DATA`), provider switcher, and live **NASA JPL Horizons REST API** query generator. |
| [`src/components/ScientificValidationView.tsx`](src/components/ScientificValidationView.tsx) | Interactive browser view for inspecting all 16 automated physics benchmarks, expected vs. actual values, numerical tolerances, and equations. |

---

## 5. 23 Automated Scientific Validation Benchmarks


Run `npm.cmd test` (or open **Chapter 07** in the browser) to verify all 23 reference benchmarks. The original 16 are listed below; the November 2026 review added seven regression benchmarks: `COORD-03` (longitude wrap & ±180° seam), `TIME-03` (LTST clock carry), `EARTH-03` (libration-longitude sign: post-perigee → east), `HORIZ-02` (horizon-mask interpolation across the 355°→0° seam), `HORIZ-03` (great-circle preset snapping at the pole), `SOLVIS-02` (exact circular-segment disc area at ±½ R☉), and `POW-02` (exact flat-panel cosine law). `EARTH-02` now uses an honest ±9° libration envelope (its previous ±6° only passed because the libration sign was wrong).

| ID | Category | Benchmark Test | Expected Reference | Tolerance |
| :--- | :--- | :--- | :--- | :--- |
| **`COORD-01`** | 1. Coordinate Transformations | Selenographic (`MOON_ME`) ↔ 3D Cartesian Round-Trip (`-89.46°S, -137.80°W`) | `-89.4600°, -137.8000°` | `±0.001°` |
| **`COORD-02`** | 1. Coordinate Transformations | Great-Circle Selenodesic Pole-to-Equator Distance (`90°` arc on `R=1737.4 km`) | `2729.102 km` | `±0.05 km` |
| **`TIME-01`** | 2. Time Conversions | J2000.0 Reference Epoch (`2000-01-01T12:00:00Z`) Julian Date Identity | `2451545.00000 JD` | `±0.00001 JD` |
| **`TIME-02`** | 2. Time Conversions | Lunar Local True Solar Time (`LTST`) Noon & Midnight Meridian Identity | `12.00h / 0.00h` | `±0.01 hours` |
| **`SUN-01`** | 3. Sun Position | Sub-Solar Point Zenith Elevation Identity (`El = +90.0°`) | `+90.000°` | `±0.01°` |
| **`SUN-02`** | 3. Sun Position | Exact South Pole (`-90°S`) Solar Elevation vs. Sub-Solar Latitude | `-1.542°` | `±0.01°` |
| **`SUN-03`** | 3. Sun Position | Selenographic East-Sunrise (`90° Az`) & West-Sunset (`270° Az`) Convention | `Dawn 90.0° / Dusk 270.0°` | `±0.05°` |
| **`EARTH-01`** | 4. Earth Position | Far-Side (Von Kármán `44.45°S, 177.6°E`) Permanent Earth Occultation | `< -30.0°` (`-46.88°`) | `±0.1°` |
| **`EARTH-02`** | 4. Earth Position | Apollo 11 (`1969-07-20T20:17:40Z`) Topocentric Earth Elevation & Libration Fixture | `66.5° (±6.0°)` | `±6.0°` |
| **`HORIZ-01`** | 5. Terrain Horizon | Hypsometric Horizon Mask Altitude Sensitivity (Deep Basin vs. High Summit) | `Mean(Basin) > Mean(Summit) + 2°` | `±0.1°` |
| **`SOLVIS-01`** | 6. Solar Visibility | Finite Solar Disc (`R_☉ = 0.266°`) Limb Grazing Obstruction Model | `1.000 / 0.500 / 0.000` | `±0.005` |
| **`EARTHVIS-01`** | 7. Earth Visibility | Non-Equivalence of Geometric Elevation (`>0°`) and Operational DTE Lock | `Geom=true, Obstructed=true, DTE=false` | Exact boolean |
| **`SHAD-01`** | 8. Shadow Calculations | Equatorial Synodic Day/Night Duty Cycle (`0°N, 0°E` over 28 days) | `50.0% (±8.0%)` | `±8.0%` |
| **`SHAD-02`** | 8. Shadow Calculations | Operational Window State Conservation (`672h`) & Sunrise/Sunset Detection | `672h (≥1 Rise, ≥1 Set)` | `0 hours` |
| **`POW-01`** | 9. Power Estimates | Polar Grazing Sun (`+2° El`): Vertical Mast (`90°`) vs. Flat Panel (`0°`) Cosine Law | `Ratio > 20.0×` (`28.3×`) | `±0.5 ratio` |
| **`COMM-01`** | 10. Comm Constraints | Ka-Band (`32 GHz`) Free-Space Path Loss at Mean Lunar Range (`384,400 km`) | `234.2 dB` | `±0.2 dB` |

---

## 5b. November 2026 Review — Fixes & New Features

**Physics / provider fixes**
- Optical libration in longitude had its leading `6.289·sin(M′)` term negated relative to the rest of the equation-of-center series; the sign is now consistent (Earth displaced east after perigee). Earth azimuth/elevation at every site changes by up to ~12° over a month as a result.
- Finite solar-disc visibility now uses the exact circular-segment area (previously a smoothstep approximation while the docs claimed segment integration).
- Power uncertainty propagates the stated ±1.5° horizon-mask uncertainty (was a hidden ±0.4°).
- Preset-site matching uses a 4 km great-circle radius instead of a lat/lon box (a 1.3° longitude offset at 89.46°S is only 370 m and now snaps correctly).
- Horizon-mask sampling derives its step from the profile length and wraps across the 360° seam.
- Sun/Earth "time to next transition" now carries a `transitionWithinWindow` flag; the UI says "none in window" instead of presenting the remaining stay as a forecast event.
- Timeline points carry Sun/Earth azimuths and disc fraction so the Sky Dome reads the provider's cached timeline rather than re-deriving an ephemeris in the component.

**UI / scene fixes**
- 4K NASA texture loading uses a listener registry (components mounted after a Global↔Local switch still receive maps), reports load failures, and shows a streaming/fallback badge in the viewport.
- Local Relief clicks convert via a documented 1 unit ≈ 300 m scale (previously jumped the target tens of km); both HLS rings derive from that scale.
- Expedition-card camera flights use a nonce so repeated requests always fire.
- Globe "BRAVO" beacons now show the actual Bravo scenario (they previously drifted from it after swaps/snapshot loads); un-pinning a site no longer makes it Bravo; swapping scenarios swaps the relay assumption too.
- Comparison charts merge Alpha/Bravo by hour (not array index) and its readiness bars/event counts use the same provider summary as every other panel.
- Timeline "Now" marker renders for any elapsed hour (numeric X axis). Scroll offsets track the real sticky-header height.
- Missing `.lunaris-glass-panel` CSS and `animate-fadeIn` keyframes added; provenance badges corrected (72-bin parametric mask, published reference elevations rather than "measured LOLA DEM"); Horizons query uses 0–360° east longitude; Escape closes modals/popovers; favicon and meta description added.

**New features**
- **Landing Window Scanner** (Chapter 03): sweeps the next 30 landing dates with the same engine and ranks them by Sun+DTE hours, solar duty, least blackout, or screening score, with one-click apply.
- **Shareable permalinks**: the full Alpha/Bravo configuration lives in the URL hash; a header **Share** button copies it.
- **Persistent snapshots** (localStorage, capped at 12) and **keyboard scrubbing** (Space play/pause, ←/→ ±1 h, Shift+arrows ±24 h, Home/End).

## 6. Getting Started, Commands & Verification

```powershell
# 1. Install dependencies
npm.cmd install

# 2. Run the 23 automated scientific validation benchmarks in Node.js
npm.cmd test

# 3. Start the interactive development server
npm.cmd run dev

# 4. Run strict TypeScript type-checking and build the production bundle
npm.cmd run build
```

---

## 7. Data Sources, Credits & References

**NASA data and resources**
- NASA Scientific Visualization Studio, *CGI Moon Kit* (SVS #4720): LRO LROC WAC color mosaic and LRO LOLA elevation maps — https://svs.gsfc.nasa.gov/4720
- Lunar Reconnaissance Orbiter Camera (LROC) — https://www.lroc.asu.edu/
- LRO Lunar Orbiter Laser Altimeter (LOLA) / PDS Geosciences Node — https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- NASA JPL Horizons System API — https://ssd.jpl.nasa.gov/horizons/
- NASA Artemis III candidate landing regions — https://www.nasa.gov/artemis/
- NASA image galleries (images.nasa.gov / nasa.gov). The Starship HLS and Axiom suit images are artist's concept illustrations published by NASA (credit: NASA / SpaceX and NASA / Axiom Space respectively).

**Algorithms and references**
- Jean Meeus, *Astronomical Algorithms* (2nd ed.) — lunar ephemeris and libration series.
- IAU Working Group on Cartographic Coordinates — Moon Mean Earth / Polar Axis (`MOON_ME`) frame.

**Open-source software**
React, TypeScript, Vite, Three.js, React Three Fiber, drei, GSAP, Lenis, Recharts, Tailwind CSS, lucide-react, esbuild (all MIT or similarly permissive licenses).
