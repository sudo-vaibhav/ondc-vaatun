---
name: image-generation
description: Generate AI images with various themes, styles, and aspect ratios. Use when asked to generate images, create artwork, make graphics, generate backgrounds, or create visual assets.
allowed-tools: Bash, Read, Write, Glob
---

# Image Generation Skill

Generate AI-powered images using Google's Gemini image generation model. This skill is **fully portable** - just copy the entire folder to any project's `.claude/skills/` directory.

## Setup (One-time per project)

Before first use, install the skill's dependencies:

```bash
cd .claude/skills/image-generation && npm install && cd -
```

## Quick Reference

### Available Commands

```bash
# Generate a single preset
node .claude/skills/image-generation/scripts/generate.mjs --preset hero

# Generate with specific theme combination
node .claude/skills/image-generation/scripts/generate.mjs --preset hero --theme blue --style tech

# Generate with custom prompt
node .claude/skills/image-generation/scripts/generate.mjs --prompt "Abstract flowing waves" --ratio 16:9 --output custom.png

# Generate all presets for a theme
node .claude/skills/image-generation/scripts/generate.mjs --theme teal --style fintech

# List available options
node .claude/skills/image-generation/scripts/generate.mjs --list-themes
node .claude/skills/image-generation/scripts/generate.mjs --list-styles
node .claude/skills/image-generation/scripts/generate.mjs --list
```

### Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| `16:9` | Hero backgrounds, banners, headers |
| `4:3` | Card backgrounds, content sections |
| `1:1` | Accent patterns, icons, social media |
| `3:4` | Portrait backgrounds, testimonials |
| `21:9` | Ultra-wide banners |

### Color Themes

| Theme | Description | Primary Color |
|-------|-------------|---------------|
| `teal` | Cool teal/cyan palette | #3a9a8c |
| `maroon` | Bold crimson/red palette | #A61D1D |
| `blue` | Professional ocean blue | #2563eb |
| `purple` | Elegant royal purple | #7c3aed |
| `green` | Natural forest green | #059669 |
| `orange` | Warm energetic orange | #ea580c |
| `neutral` | Clean neutral gray | #525252 |

### Style Themes

| Style | Description | Visual Elements |
|-------|-------------|-----------------|
| `fintech` | Fintech/Insurance | Flowing waves, halftone patterns |
| `biotech` | Biotech/Research | Molecular structures, DNA helixes |
| `tech` | Tech/SaaS | Geometric grids, circuit patterns |
| `nature` | Nature/Organic | Leaf patterns, natural textures |
| `minimal` | Minimal/Clean | Simple shapes, clean lines |
| `abstract` | Abstract/Artistic | Bold shapes, artistic compositions |

### Presets

| Preset | Ratio | Purpose |
|--------|-------|---------|
| `hero` | 16:9 | Main hero section backgrounds |
| `card` | 4:3 | Card and content backgrounds |
| `accent` | 1:1 | Decorative accent patterns |
| `testimonial` | 3:4 | Portrait-oriented backgrounds |
| `stats` | 1:1 | Statistics section backgrounds |
| `banner` | 21:9 | Ultra-wide banners |
| `icon` | 1:1 | Small icon-style patterns |

## Usage Patterns

### Generate Images for Website Sections

When asked to generate website graphics:

1. Install dependencies if not already done: `cd .claude/skills/image-generation && npm install && cd -`
2. Determine the use case (hero, cards, accents, etc.)
3. Choose appropriate color theme based on brand
4. Choose style theme based on industry
5. Run the generation command using `scripts/generate.mjs`

### Custom Image Generation

For custom prompts, include:
- Color palette description
- Visual elements to include
- Style/aesthetic guidance
- What to avoid (text, logos, faces)

Example:
```bash
node .claude/skills/image-generation/scripts/generate.mjs \
  --prompt "Abstract geometric pattern with flowing teal gradients. Minimalist aesthetic. No text or logos." \
  --ratio 16:9 \
  --output my-image.png
```

### Batch Generation

Generate all presets for a specific theme combination:
```bash
node .claude/skills/image-generation/scripts/generate.mjs --theme purple --style tech
```

### Custom Output Directory

Override the default output location:
```bash
node .claude/skills/image-generation/scripts/generate.mjs --preset hero --output-dir ./assets/backgrounds
```

## Output Location

The script automatically detects common image directories in this order:
1. `public/images/`
2. `public/`
3. `assets/images/`
4. `assets/`
5. `images/`
6. `static/images/`
7. `static/`

Falls back to creating `public/images/` if none exist.

## Requirements

- **Node.js** 18+
- **AI_API_KEY** environment variable in project root `.env` file
- Uses Google Gemini model: `gemini-3-pro-image-preview`

## Portability

This skill is designed to be copy-pasted across projects:

1. Copy the entire `.claude/skills/image-generation/` folder to new project
2. Ensure `AI_API_KEY` is set in the project's root `.env` file
3. Run `cd .claude/skills/image-generation && npm install && cd -`
4. Start generating images!

The script automatically:
- Finds the project root by looking for `.env` or `package.json`
- Detects the appropriate output directory
- Works with any package manager (npm, pnpm, yarn, bun)

## Best Practices

1. **Match theme to brand**: Use color themes that align with project brand colors
2. **Match style to industry**: Use fintech for financial, biotech for scientific, tech for SaaS
3. **Use presets first**: Presets are optimized for common website sections
4. **Custom prompts for special needs**: Only use custom prompts when presets don't fit

## Troubleshooting

If generation fails:
1. Check that `AI_API_KEY` is set in project root `.env`
2. Verify the API key is valid for Google AI
3. Ensure dependencies are installed: `cd .claude/skills/image-generation && npm install`
4. Check internet connectivity
5. Review the error message for specific issues

For detailed reference, see [reference.md](./reference.md).
