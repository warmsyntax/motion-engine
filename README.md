# 🌌 motion-engine-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Platform: Node.js](https://img.shields.io/badge/Platform-Node.js-green.svg)](https://nodejs.org/)
[![Protocol: MCP](https://img.shields.io/badge/Protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

An Awwwards-level, physics-based Model Context Protocol (MCP) Server for advanced user interface motion design. This tool **forces Large Language Models (LLMs) to write premium, hardware-accelerated UI animations** by eliminating generic, uninspired CSS defaults (like `transition: all 0.3s ease`) and replacing them with deterministic springs, headless browser style telemetry, and strict compositor performance rules.

Written entirely in **Node.js (ES Modules)**, it runs instantly on your machine without requiring a heavy Rust compiler toolchain.

---

## 📖 The Problem vs. The Solution

### The Problem
When you ask an AI coding agent (like Cursor, Claude Code, or Gemini CLI) to animate a UI component, it defaults to:
```css
transition: all 0.3s ease;
```
This single line contains multiple design and performance anti-patterns:
1. **`all`**: Monitored properties force the browser to waste CPU/GPU cycles on properties that never change, causing FOUC (Flash of Unstyled Content).
2. **`0.3s`**: An arbitrary duration that completely ignores the element's physical mass, spatial distance, and brand tempo.
3. **`ease`**: A generic cubic-bezier mathematical ease that cannot overshoot, bounce, or handle continuous physics. Interrupting it results in a jarring, unnatural snap.
4. **Layout Triggers**: Animating properties like `width`, `height`, `top`, or `left` forces full-page reflows on every single frame, causing visual jank.

### The Solution
`motion-engine-mcp` acts as a physical sandbox and coordinator. When an agent needs to write an animation:
1. It queries the local workspace using our **Local Brand Scraper** to understand typeface weights, tempo scales, and CSS tokens.
2. If provided with a reference website URL, our **Headless Telemetry Engine** launches a Puppeteer instance, triggers the animation, and scrapes computed frames at ~60fps to fit curves.
3. Our **Generative Physics Engine** calculates unique spring constants per animated axis utilizing a per-axis Hooke's Law solver (`F = -kx - cv`) randomized with FNV-1a deterministic noise.
4. It outputs an immutable, performance-optimized, and fully accessible **`motion.md`** specification to the workspace, compelling the agent to write high-fidelity GSAP or Framer Motion springs.

---

## ⚡ Quick Start & Setup Guide

You can run `motion-engine-mcp` using one of two methods:

---

### 🚀 Option 1: Zero-Clone Execution via `npx` (Recommended)

No need to clone the repository or manually install node modules. You can run the server directly using `npx` fetching from GitHub.

#### 1. Claude Desktop Setup
Open your Claude Desktop configuration file:
* **Windows Path**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS Path**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following to your `mcpServers` block:
```json
{
  "mcpServers": {
    "motion-engine": {
      "command": "npx",
      "args": ["-y", "github:warmsyntax/motion-engine"]
    }
  }
}
```

#### 2. Cursor IDE Setup
1. Open Cursor and go to **Settings** → **Features** → **MCP**.
2. Click **+ Add New MCP Server**.
3. Configure as follows:
   - **Name**: `motion-engine`
   - **Type**: `stdio`
   - **Command**: `npx -y github:warmsyntax/motion-engine`
4. Click **Save**.

#### 3. Claude Code Setup
Run the following command in your terminal to register the server:
```bash
claude mcp add motion-engine -- npx -y github:warmsyntax/motion-engine
```

#### 4. Gemini CLI Setup
Run the following command in your terminal to register the server:
```bash
gemini mcp add motion-engine -- npx -y github:warmsyntax/motion-engine
```
Alternatively, open your Gemini CLI settings file at `~/.gemini/settings.json` and add manually to your `mcpServers` configuration:
```json
{
  "mcpServers": {
    "motion-engine": {
      "command": "npx",
      "args": ["-y", "github:warmsyntax/motion-engine"]
    }
  }
}
```

#### 5. Codex Setup
Add the server using the Codex CLI tool:
```bash
codex mcp add motion-engine -- npx -y github:warmsyntax/motion-engine
```
Alternatively, write it directly in your `~/.codex/config.toml` configuration.

#### 6. OpenCode Setup
Run the interactive setup wizard via the OpenCode CLI:
```bash
opencode mcp add
```
When prompted, enter: **Name**: `motion-engine`, **Type**: `local`, **Command**: `npx -y github:warmsyntax/motion-engine`.

Alternatively, add it manually under the `mcp` block in your `~/.config/opencode/opencode.json`:
```json
{
  "mcp": {
    "motion-engine": {
      "type": "local",
      "command": ["npx", "-y", "github:warmsyntax/motion-engine"],
      "enabled": true
    }
  }
}
```

---

### 💻 Option 2: Local Clone & Setup (For Contributors & Devs)

If you have cloned the repository locally to a folder (e.g. `F:/motionplugin` or `~/motion-design`), follow these steps:

#### 1. Install Dependencies & Run Setup
Open your terminal in the cloned directory and run the single-command setup:
```bash
npm install && npm run setup
```
> [!NOTE]
> This command installs all dependencies (including Puppeteer), runs the verification test suite, and attempts to automatically register the local path into your **Claude Desktop** config.

#### 2. Configure Clients Manually with Local Path
If you need to configure your IDE or other clients to use the local clone:

* **Claude Desktop (`claude_desktop_config.json`)**:
  ```json
  "mcpServers": {
    "motion-engine": {
      "command": "node",
      "args": ["/absolute/path/to/your/cloned/motion-engine/index.js"]
    }
  }
  ```
  *(Remember to replace `/absolute/path/to/your/cloned/motion-engine/index.js` with the actual full absolute path on your filesystem, e.g. `F:/motionplugin/index.js` on Windows)*

* **Cursor IDE**:
  - **Name**: `motion-engine`
  - **Type**: `stdio`
  - **Command**: `node /absolute/path/to/your/cloned/motion-engine/index.js`

* **Claude Code**:
  ```bash
  claude mcp add motion-engine -- node /absolute/path/to/your/cloned/motion-engine/index.js
  ```

* **Gemini CLI**:
  ```bash
  gemini mcp add motion-engine -- node /absolute/path/to/your/cloned/motion-engine/index.js
  ```
  Or add manually to your `~/.gemini/settings.json` under `mcpServers`:
  ```json
  "motion-engine": {
    "command": "node",
    "args": ["/absolute/path/to/your/cloned/motion-engine/index.js"]
  }
  ```

* **Codex**:
  ```bash
  codex mcp add motion-engine -- node /absolute/path/to/your/cloned/motion-engine/index.js
  ```

* **OpenCode**:
  Run the interactive setup wizard:
  ```bash
  opencode mcp add
  ```
  When prompted, enter: **Name**: `motion-engine`, **Type**: `local`, **Command**: `node /absolute/path/to/your/cloned/motion-engine/index.js`.

  Or add manually in your `~/.config/opencode/opencode.json` under the `mcp` block:
  ```json
  "motion-engine": {
    "type": "local",
    "command": ["node", "/absolute/path/to/your/cloned/motion-engine/index.js"],
    "enabled": true
  }
  ```

---

## 🛠️ MCP Tool & Prompt API Reference

### 1. Tool: `generate_motion_spec`
Compiles a robust animation specification file based on telemetry analysis or mathematical physics modeling.

#### Arguments
- **`selector`** *(string, required)*: CSS selector targeting the animated element (e.g. `.hero-card` or `button.pay`).
- **`url`** *(string, optional)*: Live reference website URL to scrape real computed motion telemetry from (e.g. `https://stripe.com`).
- **`intent`** *(string, optional)*: Dynamic brand kinetic weight intent for zero-reference physics generations. Supported profiles:
  - `heavy`: High mass, overdamped ($\zeta \approx 1.5$), slower settle.
  - `grounded`: Stable, critically damped ($\zeta \approx 1.0$).
  - `balanced` (Default): Standard responsive spring ($\zeta \approx 0.72$).
  - `light`: Bouncy, snappy underdamped spring ($\zeta \approx 0.58$).
  - `floating`: Highly energetic, long-settle spring ($\zeta \approx 0.43$).

#### Output Example
Generates a structured `motion.md` in your workspace containing:
- **Spatial Perspective constraints** (e.g., `perspective: 800px`, `transform-style: preserve-3d`).
- **Physics Constant block** per animated axis (TranslateY, Opacity, Scale).
- **Thematic Rules** matched to typography class (Serif typeface caps rotation limits to preserve legibility).
- **Performance Mandates** (Compositor-only rules, CSS `will-change` management, pseudo-element shadow transitions).
- **WCAG 2.3.3 Accessibility guidelines** (reduced-motion queries).

---

### 2. Prompt: `motion_intent`
Exposes a 3-question interactive setup for developers to tailor animation requirements when in zero-reference mode.

#### Arguments
- **`kinetic_weight`** *(string, required)*: `heavy` | `grounded` | `balanced` | `light` | `floating`
- **`trigger_geometry`** *(string, required)*: `scroll` | `hover` | `time` | `scroll-scrub` | `click`
- **`spatial_plane`** *(string, required)*: `2d` | `2.5d`

---

## 🧪 Running Local Verification Tests

To verify the mathematical accuracy of the core physics solvers without launching the stdio server stream, execute:

```bash
node test.js
```

### Test Suite Validations:
- **Matrix Decompositions**: Converts CSS 2D and 3D transform strings into correct human-readable coordinate vectors.
- **FNV-1a Noise**: Verifies noise seeds are deterministic, bounded, and unique for different class selectors.
- **Euler Integration**: Confirms spring settle times are accurately calculated and corrected to the optimal `150ms-800ms` window.
- **Curve Fitter**: Compares generated damped harmonic samples to fitted stiffness and damping curves to guarantee $R^2 > 0.99$ accuracy.

---

## 🔍 Core Module Deep Dive

### 1. Matrix Decomposition (`math/matrix_decompose.js`)
Translates matrix representations into separate properties. In 3D transforms, the translation is directly read from column 3 (`m[12], m[13], m[14]`). The remaining row vectors are orthonormalized using a Gram-Schmidt process to separate out scale factors (`scale = [x, y, z]`) and Euler rotational angles.

### 2. Spring Parameter Fitter (`physics/spring_fitter.js`)
Instead of slow simulation matching, the engine evaluates the exact analytical solution to the damped harmonic oscillator:
- **Underdamped ($\zeta < 1.0$):**
  $$x(t) = e^{-\gamma t} \left(\cos(\omega_d t) + \frac{\gamma}{\omega_d}\sin(\omega_d t)\right)$$
- **Overdamped ($\zeta > 1.0$):**
  $$x(t) = e^{-\gamma t} \left(\cosh(\beta t) + \frac{\gamma}{\beta}\sinh(\beta t)\right)$$

The curve fitter executes a global parameter search sweeping stiffness ($k$) and damping ($c$), then runs a local gradient coordinate descent to fit parameters with sub-millisecond efficiency.

### 3. Will-Change & Compositor performance (`compiler/motion_md.js`)
Ensures maximum frame rates. The compiled `motion.md` strictly bans direct `box-shadow` animations (which trigger Paint and cause page reflows). It instead enforces animating `opacity` on a `::after` pseudo-element pre-rendered with the target box-shadow.

---

## 📄 License

Licensed under the [MIT License](LICENSE).
