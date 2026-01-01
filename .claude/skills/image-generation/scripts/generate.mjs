#!/usr/bin/env node

/**
 * AI Image Generation Script
 *
 * A portable image generation tool that can be dropped into any project.
 * Requires: AI_API_KEY in root .env file
 *
 * Usage:
 *   node generate.mjs --preset hero
 *   node generate.mjs --prompt "Abstract art" --ratio 16:9 --output custom.png
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find project root by looking for .env file (traverse up)
function findProjectRoot(startDir) {
  let currentDir = startDir;
  const root = dirname(currentDir);

  while (currentDir !== root) {
    // Check for common project root indicators
    if (existsSync(join(currentDir, ".env"))) {
      return currentDir;
    }
    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  // Fallback: assume .claude is in project root
  // Skill is at .claude/skills/image-generation/scripts/, so go up 4 levels
  return join(__dirname, "..", "..", "..", "..");
}

const PROJECT_ROOT = findProjectRoot(__dirname);

// Load environment variables from project root
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

const API_KEY = process.env.AI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

// Default output directory (can be overridden)
function getOutputDir() {
  // Check common image directories
  const candidates = [
    join(PROJECT_ROOT, "public/images"),
    join(PROJECT_ROOT, "public"),
    join(PROJECT_ROOT, "assets/images"),
    join(PROJECT_ROOT, "assets"),
    join(PROJECT_ROOT, "images"),
    join(PROJECT_ROOT, "static/images"),
    join(PROJECT_ROOT, "static"),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  // Default fallback
  return join(PROJECT_ROOT, "public/images");
}

// ============================================================================
// COLOR THEMES
// ============================================================================
const COLOR_THEMES = {
  teal: {
    name: "Teal/Cyan",
    primary: "#3a9a8c",
    secondary: "#5ab8aa",
    dark: "#2d4a47",
    light: "#eef3f2",
    accent: "seafoam green",
    description: "cool teal/cyan color palette",
  },
  maroon: {
    name: "Crimson/Red",
    primary: "#A61D1D",
    secondary: "#c93535",
    dark: "#4a1a1a",
    light: "#f8f0f0",
    accent: "coral",
    description: "bold crimson/red color palette",
  },
  blue: {
    name: "Ocean Blue",
    primary: "#2563eb",
    secondary: "#3b82f6",
    dark: "#1e3a5f",
    light: "#eff6ff",
    accent: "sky blue",
    description: "professional ocean blue color palette",
  },
  purple: {
    name: "Royal Purple",
    primary: "#7c3aed",
    secondary: "#8b5cf6",
    dark: "#3b1d6e",
    light: "#f5f3ff",
    accent: "lavender",
    description: "elegant royal purple color palette",
  },
  green: {
    name: "Forest Green",
    primary: "#059669",
    secondary: "#10b981",
    dark: "#1a3d2e",
    light: "#ecfdf5",
    accent: "mint",
    description: "natural forest green color palette",
  },
  orange: {
    name: "Warm Orange",
    primary: "#ea580c",
    secondary: "#f97316",
    dark: "#4a2512",
    light: "#fff7ed",
    accent: "peach",
    description: "warm energetic orange color palette",
  },
  neutral: {
    name: "Neutral Gray",
    primary: "#525252",
    secondary: "#737373",
    dark: "#171717",
    light: "#fafafa",
    accent: "silver",
    description: "clean neutral gray color palette",
  },
};

// ============================================================================
// STYLE THEMES
// ============================================================================
const STYLE_THEMES = {
  fintech: {
    name: "Fintech/Insurance",
    elements: "flowing organic waves and halftone dot patterns",
    heroDesc:
      "elegant curved shapes suggesting movement, with a subtle halftone/dot matrix texture overlay",
    cardDesc: "soft halftone dots fading into a gradient",
    accentDesc: "intersecting circles and flowing curves with halftone texture",
    testimonialDesc:
      "soft flowing waves with halftone texture overlay on organic shapes",
    statsDesc:
      "soft geometric shapes with circular and linear elements with halftone texture",
    aesthetic:
      "Minimalist, sophisticated, high-end fintech/insurance aesthetic",
  },
  biotech: {
    name: "Biotech/Research",
    elements: "molecular structures, DNA helixes, and cellular patterns",
    heroDesc:
      "interconnected nodes and flowing organic molecular shapes, with subtle microscopic cell-like textures",
    cardDesc:
      "abstract cellular patterns with soft gradients resembling petri dish cultures",
    accentDesc:
      "hexagonal molecular grids, interconnected nodes, and organic cell-like structures",
    testimonialDesc:
      "flowing DNA-like spirals with organic cell membrane textures",
    statsDesc:
      "data visualization nodes connected by molecular bonds, with circular cell-like elements",
    aesthetic: "Scientific, innovative, high-end biotech/research aesthetic",
  },
  tech: {
    name: "Tech/SaaS",
    elements: "geometric grids, circuit patterns, and data flow visualizations",
    heroDesc:
      "interconnected geometric nodes with flowing data streams and subtle grid patterns",
    cardDesc: "minimal circuit-like patterns with soft glowing nodes",
    accentDesc:
      "hexagonal grids, connecting lines, and abstract data visualization elements",
    testimonialDesc:
      "flowing network connections with subtle geometric backgrounds",
    statsDesc:
      "dashboard-inspired elements with charts, graphs, and data point visualizations",
    aesthetic: "Modern, clean, high-end tech/SaaS aesthetic",
  },
  nature: {
    name: "Nature/Organic",
    elements: "flowing organic shapes, leaf patterns, and natural textures",
    heroDesc:
      "sweeping organic curves reminiscent of leaves and water, with subtle natural textures",
    cardDesc: "soft organic gradients with subtle leaf vein patterns",
    accentDesc:
      "flowing botanical shapes, gentle curves, and natural organic forms",
    testimonialDesc: "soft natural textures with organic flowing shapes",
    statsDesc:
      "growth-inspired elements with organic charts and natural flowing data",
    aesthetic: "Organic, calming, nature-inspired aesthetic",
  },
  minimal: {
    name: "Minimal/Clean",
    elements: "simple geometric shapes, clean lines, and subtle gradients",
    heroDesc: "clean geometric shapes with soft shadows and minimal gradients",
    cardDesc: "subtle gradient with minimal geometric accents",
    accentDesc: "simple circles, lines, and basic geometric patterns",
    testimonialDesc: "clean background with subtle geometric elements",
    statsDesc: "minimal chart-inspired shapes with clean lines",
    aesthetic: "Ultra-minimal, clean, modern aesthetic",
  },
  abstract: {
    name: "Abstract/Artistic",
    elements:
      "bold abstract shapes, artistic brushstrokes, and dynamic compositions",
    heroDesc:
      "bold overlapping shapes with artistic gradients and dynamic movement",
    cardDesc: "soft abstract brushstroke textures with gradient overlays",
    accentDesc:
      "dynamic abstract compositions with bold shapes and artistic elements",
    testimonialDesc: "artistic abstract background with soft color transitions",
    statsDesc: "abstract data-inspired art with bold geometric elements",
    aesthetic: "Bold, artistic, creative abstract aesthetic",
  },
};

// ============================================================================
// PRESET GENERATOR
// ============================================================================
function getPresets(colorTheme, styleTheme = "fintech") {
  const colors = COLOR_THEMES[colorTheme] || COLOR_THEMES.teal;
  const style = STYLE_THEMES[styleTheme] || STYLE_THEMES.fintech;

  // Build suffix from both themes
  let suffix = "";
  if (colorTheme !== "teal") suffix += `-${colorTheme}`;
  if (styleTheme !== "fintech") suffix += `-${styleTheme}`;

  return {
    hero: {
      prompt: `Create an abstract art piece with ${style.elements}.
Use a ${colors.description}: deep ${colorTheme} (${colors.primary}), ${colors.accent}, dark gray (${colors.dark}), and soft cream (${colors.light}).
The composition should have ${style.heroDesc}.
Style: ${style.aesthetic}.
No text, no logos, purely abstract visual art.`,
      ratio: "16:9",
      filename: `hero-bg${suffix}.png`,
    },
    card: {
      prompt: `Create a subtle abstract background with ${style.cardDesc}.
Colors: Muted ${colorTheme} (${colors.primary} to ${colors.secondary}), with subtle cream highlights.
The pattern should be minimal and elegant, suitable as a card background.
Style: Clean, sophisticated, subtle texture. No text or logos.`,
      ratio: "4:3",
      filename: `card-pattern${suffix}.png`,
    },
    accent: {
      prompt: `Create an abstract geometric pattern with ${style.accentDesc}.
Use ${colors.name.toLowerCase()} tones: deep ${colorTheme} (${colors.primary}), ${colors.accent}, cream, and dark gray (${colors.dark}).
Style: Modern, sophisticated, minimal. No text or logos.`,
      ratio: "1:1",
      filename: `accent-pattern${suffix}.png`,
    },
    testimonial: {
      prompt: `Create an abstract portrait-oriented background with ${style.testimonialDesc}.
${colors.name} palette: ${colorTheme} (${colors.primary}), cream (${colors.light}), with hints of dark gray.
Style: Elegant, professional, minimal. No text or faces.`,
      ratio: "3:4",
      filename: `testimonial-bg${suffix}.png`,
    },
    stats: {
      prompt: `Create a minimal abstract background with ${style.statsDesc}.
Colors: ${colors.name} tones (${colors.primary}) with cream accents on dark gray (${colors.dark}) base.
Style: Clean, data-visualization inspired, sophisticated. No text.`,
      ratio: "1:1",
      filename: `stats-bg${suffix}.png`,
    },
    banner: {
      prompt: `Create an ultra-wide abstract banner with ${style.elements}.
Use ${colors.description}: ${colors.primary} flowing into ${colors.secondary}, with ${colors.accent} highlights.
The composition should be horizontally oriented with ${style.heroDesc}.
Style: ${style.aesthetic}. No text or logos.`,
      ratio: "21:9",
      filename: `banner${suffix}.png`,
    },
    icon: {
      prompt: `Create a small abstract icon-style pattern with simplified ${style.elements}.
Colors: Bold ${colorTheme} (${colors.primary}) on ${colors.light} background.
Style: Simple, iconic, recognizable at small sizes. No text.`,
      ratio: "1:1",
      filename: `icon${suffix}.png`,
    },
  };
}

// ============================================================================
// CLI ARGUMENT PARSER
// ============================================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prompt: null,
    ratio: "16:9",
    preset: null,
    output: null,
    outputDir: null,
    theme: "teal",
    style: "fintech",
    help: false,
    list: false,
    listThemes: false,
    listStyles: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
      case "-p":
        options.prompt = args[++i];
        break;
      case "--ratio":
      case "-r":
        options.ratio = args[++i];
        break;
      case "--preset":
        options.preset = args[++i];
        break;
      case "--output":
      case "-o":
        options.output = args[++i];
        break;
      case "--output-dir":
      case "-d":
        options.outputDir = args[++i];
        break;
      case "--theme":
      case "-t":
        options.theme = args[++i];
        break;
      case "--style":
      case "-s":
        options.style = args[++i];
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--list":
      case "-l":
        options.list = true;
        break;
      case "--list-themes":
        options.listThemes = true;
        break;
      case "--list-styles":
        options.listStyles = true;
        break;
    }
  }

  return options;
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================
function showHelp() {
  console.log(`
AI Image Generation Tool
=========================

Generate abstract art images using Google Gemini AI.

Usage:
  node generate.mjs [options]

Options:
  --preset <name>       Use a predefined preset (hero, card, accent, testimonial, stats, banner, icon)
  --theme, -t <name>    Color theme (${Object.keys(COLOR_THEMES).join(", ")}) [default: teal]
  --style, -s <name>    Style theme (${Object.keys(STYLE_THEMES).join(", ")}) [default: fintech]
  --prompt, -p <text>   Custom prompt for image generation
  --ratio, -r <ratio>   Aspect ratio (1:1, 4:3, 16:9, 21:9, 3:4) [default: 16:9]
  --output, -o <file>   Custom output filename
  --output-dir, -d      Custom output directory
  --list, -l            List all available presets
  --list-themes         List all available color themes
  --list-styles         List all available style themes
  --help, -h            Show this help message

Examples:
  node generate.mjs --preset hero
  node generate.mjs --preset hero --theme blue --style tech
  node generate.mjs --prompt "Abstract waves in purple" --ratio 16:9 -o custom.png
  node generate.mjs --theme maroon --style biotech

Environment:
  AI_API_KEY    Your Google AI API key (required in project root .env file)

Project Root: ${PROJECT_ROOT}
Output Dir:   ${getOutputDir()}
`);
}

function listThemes() {
  console.log("\nAvailable Color Themes:\n");
  for (const [name, config] of Object.entries(COLOR_THEMES)) {
    console.log(`  ${name.padEnd(12)} - ${config.name} (${config.primary})`);
  }
  console.log("");
}

function listStyles() {
  console.log("\nAvailable Style Themes:\n");
  for (const [name, config] of Object.entries(STYLE_THEMES)) {
    console.log(`  ${name.padEnd(12)} - ${config.name}`);
  }
  console.log("");
}

function listPresets(theme = "teal", style = "fintech") {
  const presets = getPresets(theme, style);
  const colorName = COLOR_THEMES[theme]?.name || theme;
  const styleName = STYLE_THEMES[style]?.name || style;
  console.log(`\nAvailable Presets (${colorName} + ${styleName}):\n`);
  for (const [name, config] of Object.entries(presets)) {
    console.log(
      `  ${name.padEnd(12)} - ${config.ratio.padEnd(5)} - ${config.filename}`,
    );
  }
  console.log("");
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================
async function generateImage(prompt, ratio, outputFilename, outputDir) {
  if (!API_KEY) {
    console.error("\nError: AI_API_KEY environment variable is not set");
    console.log("\nPlease add AI_API_KEY to your project root .env file:");
    console.log(`  ${join(PROJECT_ROOT, ".env")}`);
    console.log("\n  AI_API_KEY=your_google_ai_api_key_here\n");
    process.exit(1);
  }

  const OUTPUT_DIR = outputDir || getOutputDir();

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("AI Image Generator");
  console.log("=".repeat(60));
  console.log(`\nModel: ${MODEL}`);
  console.log(`Aspect Ratio: ${ratio}`);
  console.log(`Output: ${join(OUTPUT_DIR, outputFilename)}`);
  console.log("\nPrompt:");
  console.log("-".repeat(40));
  console.log(prompt);
  console.log("-".repeat(40));

  console.log("\nGenerating image...");

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: ratio,
        },
      },
    });

    let imageGenerated = false;
    let textResponse = "";

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        textResponse += part.text;
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const outputPath = join(OUTPUT_DIR, outputFilename);

        writeFileSync(outputPath, buffer);
        console.log(`\nImage saved: ${outputPath}`);
        imageGenerated = true;
      }
    }

    if (textResponse) {
      console.log(`\nModel notes: ${textResponse}`);
    }

    if (!imageGenerated) {
      console.log(
        "\nNo image was generated. The model may have returned only text.",
      );
      return false;
    }

    console.log("\nDone!\n");
    return true;
  } catch (error) {
    console.error("\nError generating image:", error.message);
    if (error.response) {
      console.error(
        "API Error Details:",
        JSON.stringify(error.response, null, 2),
      );
    }
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.listThemes) {
    listThemes();
    process.exit(0);
  }

  if (options.listStyles) {
    listStyles();
    process.exit(0);
  }

  if (options.list) {
    listPresets(options.theme, options.style);
    process.exit(0);
  }

  // Validate color theme
  if (!COLOR_THEMES[options.theme]) {
    console.error(`\nError: Unknown color theme "${options.theme}"`);
    console.log(`Available themes: ${Object.keys(COLOR_THEMES).join(", ")}`);
    process.exit(1);
  }

  // Validate style theme
  if (!STYLE_THEMES[options.style]) {
    console.error(`\nError: Unknown style theme "${options.style}"`);
    console.log(`Available styles: ${Object.keys(STYLE_THEMES).join(", ")}`);
    process.exit(1);
  }

  const PRESETS = getPresets(options.theme, options.style);
  const colorName = COLOR_THEMES[options.theme].name;
  const styleName = STYLE_THEMES[options.style].name;
  let prompt, ratio, filename;

  if (options.preset) {
    const preset = PRESETS[options.preset];
    if (!preset) {
      console.error(`\nError: Unknown preset "${options.preset}"`);
      console.log(`Available presets: ${Object.keys(PRESETS).join(", ")}`);
      process.exit(1);
    }
    prompt = preset.prompt;
    ratio = preset.ratio;
    filename = options.output || preset.filename;
  } else if (options.prompt) {
    prompt = options.prompt;
    ratio = options.ratio;
    filename = options.output || `generated-${Date.now()}.png`;
  } else {
    // Generate all presets for current theme
    console.log(
      `\nNo preset or prompt specified. Generating all presets with ${colorName} + ${styleName}...\n`,
    );

    for (const [name, config] of Object.entries(PRESETS)) {
      console.log(
        `\n>>> Generating ${name} preset (${colorName} + ${styleName})...`,
      );
      await generateImage(
        config.prompt,
        config.ratio,
        config.filename,
        options.outputDir,
      );
    }
    return;
  }

  await generateImage(prompt, ratio, filename, options.outputDir);
}

main().catch(console.error);
