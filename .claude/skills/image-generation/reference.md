# Image Generation Reference

Complete reference for the portable image generation skill.

## Installation

```bash
# Copy skill folder to your project
cp -r .claude/skills/image-generation /path/to/project/.claude/skills/

# Install dependencies
cd /path/to/project/.claude/skills/image-generation
npm install
```

## Color Themes (Detailed)

### Teal Theme
- **Primary**: `#3a9a8c` - Deep teal
- **Secondary**: `#5ab8aa` - Lighter teal
- **Dark**: `#2d4a47` - Dark gray-teal
- **Light**: `#eef3f2` - Soft cream
- **Accent**: Seafoam green
- **Best for**: Professional services, healthcare, finance, tech

### Maroon Theme
- **Primary**: `#A61D1D` - Bold crimson
- **Secondary**: `#c93535` - Lighter red
- **Dark**: `#4a1a1a` - Dark maroon
- **Light**: `#f8f0f0` - Warm cream
- **Accent**: Coral
- **Best for**: Bold brands, energy, passion, urgency

### Blue Theme
- **Primary**: `#2563eb` - Ocean blue
- **Secondary**: `#3b82f6` - Bright blue
- **Dark**: `#1e3a5f` - Deep navy
- **Light**: `#eff6ff` - Ice blue
- **Accent**: Sky blue
- **Best for**: Corporate, trust, technology, communication

### Purple Theme
- **Primary**: `#7c3aed` - Royal purple
- **Secondary**: `#8b5cf6` - Light violet
- **Dark**: `#3b1d6e` - Deep purple
- **Light**: `#f5f3ff` - Lavender mist
- **Accent**: Lavender
- **Best for**: Creative, luxury, innovation, mystery

### Green Theme
- **Primary**: `#059669` - Forest green
- **Secondary**: `#10b981` - Emerald
- **Dark**: `#1a3d2e` - Deep forest
- **Light**: `#ecfdf5` - Mint cream
- **Accent**: Mint
- **Best for**: Nature, sustainability, health, growth

### Orange Theme
- **Primary**: `#ea580c` - Warm orange
- **Secondary**: `#f97316` - Bright orange
- **Dark**: `#4a2512` - Burnt sienna
- **Light**: `#fff7ed` - Peach cream
- **Accent**: Peach
- **Best for**: Energy, creativity, fun, appetite

### Neutral Theme
- **Primary**: `#525252` - Medium gray
- **Secondary**: `#737373` - Light gray
- **Dark**: `#171717` - Near black
- **Light**: `#fafafa` - Off white
- **Accent**: Silver
- **Best for**: Minimal, professional, content-focused

## Style Themes (Detailed)

### Fintech Style
- **Visual Elements**: Flowing organic waves and halftone dot patterns
- **Hero**: Elegant curved shapes suggesting movement, subtle halftone/dot matrix texture overlay
- **Card**: Soft halftone dots fading into a gradient
- **Accent**: Intersecting circles and flowing curves with halftone texture
- **Testimonial**: Soft flowing waves with halftone texture overlay on organic shapes
- **Stats**: Soft geometric shapes with circular and linear elements with halftone texture
- **Aesthetic**: Minimalist, sophisticated, high-end fintech/insurance

### Biotech Style
- **Visual Elements**: Molecular structures, DNA helixes, and cellular patterns
- **Hero**: Interconnected nodes and flowing organic molecular shapes, subtle microscopic cell-like textures
- **Card**: Abstract cellular patterns with soft gradients resembling petri dish cultures
- **Accent**: Hexagonal molecular grids, interconnected nodes, and organic cell-like structures
- **Testimonial**: Flowing DNA-like spirals with organic cell membrane textures
- **Stats**: Data visualization nodes connected by molecular bonds, circular cell-like elements
- **Aesthetic**: Scientific, innovative, high-end biotech/research

### Tech Style
- **Visual Elements**: Geometric grids, circuit patterns, and data flow visualizations
- **Hero**: Interconnected geometric nodes with flowing data streams and subtle grid patterns
- **Card**: Minimal circuit-like patterns with soft glowing nodes
- **Accent**: Hexagonal grids, connecting lines, and abstract data visualization elements
- **Testimonial**: Flowing network connections with subtle geometric backgrounds
- **Stats**: Dashboard-inspired elements with charts, graphs, and data point visualizations
- **Aesthetic**: Modern, clean, high-end tech/SaaS

### Nature Style
- **Visual Elements**: Flowing organic shapes, leaf patterns, and natural textures
- **Hero**: Sweeping organic curves reminiscent of leaves and water, with subtle natural textures
- **Card**: Soft organic gradients with subtle leaf vein patterns
- **Accent**: Flowing botanical shapes, gentle curves, and natural organic forms
- **Testimonial**: Soft natural textures with organic flowing shapes
- **Stats**: Growth-inspired elements with organic charts and natural flowing data
- **Aesthetic**: Organic, calming, nature-inspired

### Minimal Style
- **Visual Elements**: Simple geometric shapes, clean lines, and subtle gradients
- **Hero**: Clean geometric shapes with soft shadows and minimal gradients
- **Card**: Subtle gradient with minimal geometric accents
- **Accent**: Simple circles, lines, and basic geometric patterns
- **Testimonial**: Clean background with subtle geometric elements
- **Stats**: Minimal chart-inspired shapes with clean lines
- **Aesthetic**: Ultra-minimal, clean, modern

### Abstract Style
- **Visual Elements**: Bold abstract shapes, artistic brushstrokes, and dynamic compositions
- **Hero**: Bold overlapping shapes with artistic gradients and dynamic movement
- **Card**: Soft abstract brushstroke textures with gradient overlays
- **Accent**: Dynamic abstract compositions with bold shapes and artistic elements
- **Testimonial**: Artistic abstract background with soft color transitions
- **Stats**: Abstract data-inspired art with bold geometric elements
- **Aesthetic**: Bold, artistic, creative abstract

## CLI Options Summary

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--preset` | | Use predefined preset | - |
| `--theme` | `-t` | Color theme | `teal` |
| `--style` | `-s` | Style theme | `fintech` |
| `--prompt` | `-p` | Custom prompt | - |
| `--ratio` | `-r` | Aspect ratio | `16:9` |
| `--output` | `-o` | Output filename | auto |
| `--output-dir` | `-d` | Output directory | auto-detected |
| `--list` | `-l` | List presets | - |
| `--list-themes` | | List color themes | - |
| `--list-styles` | | List style themes | - |
| `--help` | `-h` | Show help | - |

## File Naming Convention

Generated files follow this pattern:
- Base preset: `{preset-name}.png` (e.g., `hero-bg.png`)
- With non-default color: `{preset-name}-{color}.png` (e.g., `hero-bg-maroon.png`)
- With non-default style: `{preset-name}-{style}.png` (e.g., `hero-bg-biotech.png`)
- With both: `{preset-name}-{color}-{style}.png` (e.g., `hero-bg-maroon-biotech.png`)

## Extending Themes

To add new color or style themes, edit `scripts/generate.mjs`:

### Adding a Color Theme

Add to `COLOR_THEMES` object:
```javascript
newTheme: {
  name: "Display Name",
  primary: "#hexcode",
  secondary: "#hexcode",
  dark: "#hexcode",
  light: "#hexcode",
  accent: "accent color name",
  description: "description for prompts"
}
```

### Adding a Style Theme

Add to `STYLE_THEMES` object:
```javascript
newStyle: {
  name: "Display Name",
  elements: "main visual elements description",
  heroDesc: "hero-specific description",
  cardDesc: "card-specific description",
  accentDesc: "accent-specific description",
  testimonialDesc: "testimonial-specific description",
  statsDesc: "stats-specific description",
  aesthetic: "overall aesthetic description"
}
```

## Project Root Detection

The script finds the project root by traversing up from the skill directory, looking for:
1. `.env` file (preferred)
2. `package.json` file

If neither is found, it assumes the root is 3 directories up from the skill location (`.claude/skills/image-generation/`).

## Output Directory Detection

The script looks for existing image directories in this order:
1. `public/images/`
2. `public/`
3. `assets/images/`
4. `assets/`
5. `images/`
6. `static/images/`
7. `static/`

If none exist, it creates `public/images/`.

Override with `--output-dir` flag.

## API Details

- **Model**: `gemini-3-pro-image-preview`
- **API**: Google GenAI (`@google/genai`)
- **Response**: Base64 encoded PNG image
- **Environment Variable**: `AI_API_KEY`

## Skill Files

```
.claude/skills/image-generation/
├── SKILL.md        # Main skill definition (loaded by Claude)
├── reference.md    # This detailed reference
├── package.json    # Dependencies (self-contained)
└── scripts/
    └── generate.mjs    # Standalone generation script
```

## Usage Examples

### Generate hero for a tech SaaS product (blue + tech)
```bash
node .claude/skills/image-generation/scripts/generate.mjs --preset hero --theme blue --style tech
```

### Generate nature-themed green backgrounds
```bash
node .claude/skills/image-generation/scripts/generate.mjs --theme green --style nature
```

### Custom artistic image
```bash
node .claude/skills/image-generation/scripts/generate.mjs \
  --prompt "Bold abstract composition with overlapping geometric shapes in purple and gold. Dynamic, artistic, modern. No text." \
  --ratio 16:9 \
  --output artistic-hero.png
```

### Generate to specific directory
```bash
node .claude/skills/image-generation/scripts/generate.mjs \
  --preset hero \
  --theme purple \
  --output-dir ./src/assets/backgrounds
```
