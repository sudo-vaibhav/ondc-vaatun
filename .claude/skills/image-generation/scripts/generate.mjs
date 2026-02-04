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
 *   node generate.mjs --prompt "Same character waving" --reference ./samples/character.png
 *   node generate.mjs --prompt "Combine these styles" --reference img1.png --reference img2.png
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create require from skill directory for proper module resolution of skill dependencies
const skillRequire = createRequire(join(__dirname, "..", "package.json"));

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

// ============================================================================
// IMAGE GENERATION MODELS
// ============================================================================
const MODELS = {
  flash: {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash",
    price: "~$0.039/image",
    description: "Fast, cost-effective, good quality (recommended)",
  },
  pro: {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro",
    price: "~$0.134/image",
    description: "Highest quality, preview model",
  },
};
const DEFAULT_MODEL = "flash";

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
// BACKGROUND MODES
// ============================================================================
const BACKGROUND_MODES = {
  solid: {
    name: "Solid White",
    promptSuffix: "Clean solid white background.",
    description: "Pure white background, easy to composite",
    removeBackground: false,
  },
  fade: {
    name: "Fade to White",
    promptSuffix:
      "Background fades softly to white at the edges with a gentle vignette effect. Environmental elements should fade out gradually toward the edges while the main subject remains crisp and detailed in the center.",
    description: "Environment fades to white edges (mascot with context style)",
    removeBackground: false,
  },
  transparent: {
    name: "Transparent (auto-remove)",
    promptSuffix:
      "Include environmental props and context elements as part of the composition. The character and all props should be rendered as a cohesive foreground group with clean edges. Use a simple, solid, contrasting background color behind the entire scene to enable clean background removal while preserving the character and all environmental elements.",
    description:
      "Keeps character + environment/props, removes only the background behind them",
    removeBackground: true,
  },
  scene: {
    name: "Full Scene",
    promptSuffix: "",
    description: "Full environmental background, no transparency",
    removeBackground: false,
  },
};

// ============================================================================
// BACKGROUND REMOVAL (using @imgly/background-removal-node)
// ============================================================================

/**
 * Remove background from an image buffer using @imgly/background-removal-node
 * Returns the processed buffer with transparent background, or null on failure
 */
// Singleton state for background removal model
let bgRemovalModel = null;
let bgRemovalProcessor = null;

async function initBackgroundRemovalModel() {
  if (bgRemovalModel && bgRemovalProcessor) {
    return { model: bgRemovalModel, processor: bgRemovalProcessor };
  }

  const { env, AutoModel, AutoProcessor } = await import(
    "@huggingface/transformers"
  );

  // Configure for Node.js
  env.allowLocalModels = false;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.proxy = false;
  }

  console.log("Loading RMBG-1.4 model (first run downloads ~45MB)...");

  // Use briaai/RMBG-1.4 - works cross-platform, free for non-commercial use
  bgRemovalModel = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
    config: { model_type: "custom" },
  });

  bgRemovalProcessor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: "ImageFeatureExtractor",
      image_std: [1, 1, 1],
      resample: 2,
      rescale_factor: 0.00392156862745098,
      size: { width: 1024, height: 1024 },
    },
  });

  return { model: bgRemovalModel, processor: bgRemovalProcessor };
}

async function removeBackgroundFromBuffer(imageBuffer) {
  try {
    // Using @huggingface/transformers with briaai/RMBG-1.4
    // Free, open source, runs locally via ONNX Runtime
    // See: https://huggingface.co/briaai/RMBG-1.4
    const { RawImage } = await import("@huggingface/transformers");
    const sharp = skillRequire("sharp");

    console.log("Removing background...");

    // Initialize model (singleton pattern - only loads once)
    const { model, processor } = await initBackgroundRemovalModel();

    // Load image from buffer
    const img = await RawImage.fromBlob(
      new Blob([imageBuffer], { type: "image/png" }),
    );

    // Pre-process image
    const { pixel_values } = await processor(img);

    // Predict alpha matte
    const { output } = await model({ input: pixel_values });

    // Resize mask back to original size
    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height,
      )
    ).data;

    // Apply alpha mask to original image using sharp
    // First get the original image as raw RGBA
    const originalRgba = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Apply the mask to alpha channel
    const rgbaData = new Uint8ClampedArray(originalRgba.data);
    for (let i = 0; i < maskData.length; i++) {
      rgbaData[4 * i + 3] = maskData[i]; // Set alpha channel
    }

    // Convert back to PNG
    const optimizedBuffer = await sharp(Buffer.from(rgbaData), {
      raw: {
        width: originalRgba.info.width,
        height: originalRgba.info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    console.log("✓ Background removed successfully");
    return optimizedBuffer;
  } catch (error) {
    console.warn(`⚠️  Background removal failed: ${error.message}`);
    console.warn(
      "   Tip: Run 'cd .claude/skills/image-generation && npm install' to install dependencies",
    );
    return null;
  }
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
    model: DEFAULT_MODEL,
    help: false,
    list: false,
    listThemes: false,
    listStyles: false,
    listBackgrounds: false,
    listModels: false,
    referenceImages: [],
    background: "solid",
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
      case "--reference":
      case "--ref":
      case "-i":
        options.referenceImages.push(args[++i]);
        break;
      case "--background":
      case "--bg":
      case "-b":
        options.background = args[++i];
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
      case "--list-backgrounds":
        options.listBackgrounds = true;
        break;
      case "--model":
      case "-m":
        options.model = args[++i];
        break;
      case "--list-models":
        options.listModels = true;
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
  --reference, --ref, -i <path>
                        Reference image(s) or directory for style consistency.
                        Can be repeated. Directories are scanned one level deep.
  --background, --bg, -b <mode>
                        Background mode: solid, fade, transparent, scene
                        [default: solid]
  --model, -m <name>    Model to use: flash (cheap), pro (quality)
                        [default: flash]
  --list, -l            List all available presets
  --list-themes         List all available color themes
  --list-models         List all available models
  --list-styles         List all available style themes
  --list-backgrounds    List all available background modes
  --help, -h            Show this help message

Examples:
  node generate.mjs --preset hero
  node generate.mjs --preset hero --theme blue --style tech
  node generate.mjs --prompt "Abstract waves in purple" --ratio 16:9 -o custom.png
  node generate.mjs --theme maroon --style biotech

  # With reference images for style consistency:
  node generate.mjs --prompt "Same character waving" --ref ./samples/character.png
  node generate.mjs --prompt "Combine styles" --ref ./samples/ -o combined.png

  # With background modes:
  node generate.mjs --prompt "Otter at desk" --bg fade -o mascot-fade.png
  node generate.mjs --prompt "Otter with computer" --bg transparent -o mascot.png

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

function listBackgrounds() {
  console.log("\nAvailable Background Modes:\n");
  for (const [name, config] of Object.entries(BACKGROUND_MODES)) {
    const autoRemove = config.removeBackground ? " [auto-removes bg]" : "";
    console.log(`  ${name.padEnd(12)} - ${config.description}${autoRemove}`);
  }
  console.log("");
}

function listModels() {
  console.log("\nAvailable Models:\n");
  for (const [name, config] of Object.entries(MODELS)) {
    const isDefault = name === DEFAULT_MODEL ? " (default)" : "";
    console.log(
      `  ${name.padEnd(8)} - ${config.name} ${config.price}${isDefault}`,
    );
    console.log(`           ${config.description}`);
  }
  console.log("");
}

// ============================================================================
// IMAGE HELPERS
// ============================================================================

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath) {
  const ext = filePath.toLowerCase().split(".").pop();
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[ext] || "image/png";
}

/**
 * Expand reference paths - if a path is a directory, scan it for images (one level)
 * Returns flat array of image file paths
 */
function expandReferencePaths(paths) {
  const expandedPaths = [];
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

  for (const inputPath of paths) {
    // Resolve relative paths from project root
    const resolvedPath = inputPath.startsWith("/")
      ? inputPath
      : join(PROJECT_ROOT, inputPath);

    if (!existsSync(resolvedPath)) {
      console.warn(`Warning: Path not found: ${resolvedPath}`);
      continue;
    }

    try {
      const stats = statSync(resolvedPath);

      if (stats.isDirectory()) {
        // Scan directory for image files (one level only)
        const files = readdirSync(resolvedPath);
        for (const file of files) {
          const ext = file.toLowerCase().slice(file.lastIndexOf("."));
          if (imageExtensions.includes(ext)) {
            expandedPaths.push(join(resolvedPath, file));
          }
        }
      } else if (stats.isFile()) {
        // It's a file, add directly
        expandedPaths.push(resolvedPath);
      }
    } catch (error) {
      console.warn(
        `Warning: Could not process path ${inputPath}: ${error.message}`,
      );
    }
  }

  return expandedPaths;
}

/**
 * Load and encode reference images as base64
 * Returns array of { mimeType, data } objects
 */
function loadReferenceImages(imagePaths) {
  const loadedImages = [];

  // First expand any directory paths
  const expandedPaths = expandReferencePaths(imagePaths);

  if (expandedPaths.length === 0 && imagePaths.length > 0) {
    console.warn("No valid image files found in provided paths.");
    return loadedImages;
  }

  for (const resolvedPath of expandedPaths) {
    try {
      const imageBuffer = readFileSync(resolvedPath);
      const base64Data = imageBuffer.toString("base64");
      const mimeType = getMimeType(resolvedPath);

      loadedImages.push({
        path: resolvedPath,
        mimeType,
        data: base64Data,
      });

      // Show relative path for cleaner output
      const displayPath = resolvedPath.replace(PROJECT_ROOT + "/", "");
      console.log(`  Loaded: ${displayPath} (${mimeType})`);
    } catch (error) {
      console.warn(
        `Warning: Failed to load reference image ${resolvedPath}: ${error.message}`,
      );
    }
  }

  return loadedImages;
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================
async function generateImage(
  prompt,
  ratio,
  outputFilename,
  outputDir,
  referenceImages = [],
  backgroundMode = "solid",
  modelKey = DEFAULT_MODEL,
) {
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

  // Get model config
  const modelConfig = MODELS[modelKey] || MODELS[DEFAULT_MODEL];

  // Get background mode config
  const bgConfig = BACKGROUND_MODES[backgroundMode] || BACKGROUND_MODES.solid;

  console.log("\n" + "=".repeat(60));
  console.log("AI Image Generator");
  console.log("=".repeat(60));
  console.log(`\nModel: ${modelConfig.name} (${modelConfig.id})`);
  console.log(`Aspect Ratio: ${ratio}`);
  console.log(
    `Background: ${bgConfig.name}${bgConfig.removeBackground ? " (will auto-remove)" : ""}`,
  );
  console.log(`Output: ${join(OUTPUT_DIR, outputFilename)}`);

  // Load reference images if provided
  let loadedReferences = [];
  if (referenceImages.length > 0) {
    console.log(`\nReference Images (${referenceImages.length}):`);
    loadedReferences = loadReferenceImages(referenceImages);
    if (loadedReferences.length === 0) {
      console.warn(
        "\nWarning: No reference images could be loaded. Proceeding without them.",
      );
    }
  }

  // Build the full prompt with background mode suffix
  let enhancedPrompt = prompt;
  if (bgConfig.promptSuffix) {
    enhancedPrompt = `${prompt} ${bgConfig.promptSuffix}`;
  }

  console.log("\nPrompt:");
  console.log("-".repeat(40));
  console.log(enhancedPrompt);
  console.log("-".repeat(40));

  console.log("\nGenerating image...");

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Build content parts: reference images first, then text prompt
    const parts = [];

    // Add reference images as inline data
    for (const ref of loadedReferences) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data,
        },
      });
    }

    // Add text prompt (with context about reference images if provided)
    let fullPrompt = enhancedPrompt;
    if (loadedReferences.length > 0) {
      fullPrompt = `Use the provided reference image(s) as style guide. Maintain the same art style, color palette, and character design. ${enhancedPrompt}`;
    }
    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: modelConfig.id,
      contents: [{ parts }],
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
        let buffer = Buffer.from(imageData, "base64");
        const outputPath = join(OUTPUT_DIR, outputFilename);

        // Apply background removal if requested
        if (bgConfig.removeBackground) {
          const processedBuffer = await removeBackgroundFromBuffer(buffer);
          if (processedBuffer) {
            buffer = processedBuffer;
          } else {
            console.log("Saving original image (background removal failed)");
          }
        }

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

  if (options.listBackgrounds) {
    listBackgrounds();
    process.exit(0);
  }

  if (options.listModels) {
    listModels();
    process.exit(0);
  }

  // Validate color theme
  if (!COLOR_THEMES[options.theme]) {
    console.error(`\nError: Unknown color theme "${options.theme}"`);
    console.log("Available themes: " + Object.keys(COLOR_THEMES).join(", "));
    process.exit(1);
  }

  // Validate style theme
  if (!STYLE_THEMES[options.style]) {
    console.error(`\nError: Unknown style theme "${options.style}"`);
    console.log("Available styles: " + Object.keys(STYLE_THEMES).join(", "));
    process.exit(1);
  }

  // Validate background mode
  if (!BACKGROUND_MODES[options.background]) {
    console.error(`\nError: Unknown background mode "${options.background}"`);
    console.log("Available modes: " + Object.keys(BACKGROUND_MODES).join(", "));
    process.exit(1);
  }

  // Validate model
  if (!MODELS[options.model]) {
    console.error(`\nError: Unknown model "${options.model}"`);
    console.log("Available models: " + Object.keys(MODELS).join(", "));
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
      console.log("Available presets: " + Object.keys(PRESETS).join(", "));
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
        options.referenceImages,
        options.background,
        options.model,
      );
    }
    return;
  }

  await generateImage(
    prompt,
    ratio,
    filename,
    options.outputDir,
    options.referenceImages,
    options.background,
    options.model,
  );
}

main().catch(console.error);
