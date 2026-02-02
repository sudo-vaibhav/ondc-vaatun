# Captain Otter Pose Sheet

Reference poses for Captain Otter mascot across different application states and scenarios.

## Pose Inventory

### Success States

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Success Salute | `success-salute.png` | Transparent | Data saved, form submitted, action completed |
| Task Complete | `task-complete-clipboard.png` | Transparent | Onboarding steps done, checklist completed |
| Done Relaxing | `done-relaxing.png` | Transparent | Inbox zero, workflow complete, "all caught up" |

### Loading / Waiting States

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Loading Steering | `loading-steering.png` | Transparent | System processing, page loading |
| Loading Pocket Watch | `loading-pocketwatch.png` | Transparent | Waiting for response, timer-based operations |

### Error States (Serious Expressions - Never Smiling)

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Error 500 | `error-500-fixing.png` | Transparent | Server error, system failure, "fixing it" |
| Error 404 | `error-404-lost.png` | Transparent | Page not found, lost navigation |

### Empty States

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Empty State | `empty-state-waiting.png` | Transparent | No data, empty list, "nothing here yet" |

### Utility States

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Search | `search-spyglass.png` | Transparent | Search bars, filtering, discovery |
| Help | `help-lifering.png` | Transparent | Help center, FAQ, support |
| Settings | `settings-wheel.png` | Transparent | Admin panel, configuration, permissions |
| Insight | `insight-lantern.png` | Transparent | Tips, new features, "did you know" |

### Insurance-Specific States

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Quote Review | `quote-review-ledger.png` | Transparent | Viewing insurance quote, premium breakdown |
| Protection | `protection-shield.png` | Transparent | Coverage display, policy confirmation |
| Form Guide | `form-guide-clipboard.png` | Transparent | KYC forms, data entry guidance |

### Attention Directors

| Pose | File | Background | Usage |
|------|------|------------|-------|
| Peeping Pointer | `peeping-pointer.png` | Transparent | Directing attention to UI elements |

## Expression Guidelines

### Allowed Expressions by State

| State Type | Allowed Expressions |
|------------|---------------------|
| Success | Confident, proud, satisfied, thumbs up |
| Loading | Focused, patient, attentive |
| Error/Failure | Concerned, determined, serious, puzzled |
| Empty | Curious, expectant, calm |
| Help | Friendly, ready to assist |

### Forbidden in Error States

- Smiling or cheerful expressions
- Happy/excited body language
- Thumbs up or celebratory gestures
- Any expression that minimizes the user's frustration

## Technical Specs

- **Format:** PNG with transparency
- **Aspect Ratio:** 1:1 (square)
- **Resolution:** High-resolution suitable for web and print
- **Color Palette:** Per [style-and-color-guide.md](../style-and-color-guide.md)
  - Primary Purple: `#6C59A4`
  - Gold Accents: `#F3CA5C`
  - Dark Trim: `#474B82`

## Usage Notes

1. **Error states must never show happy expressions** - See governance rules in style guide
2. **No speech bubbles** - Captain Otter communicates through body language only
3. **Props define context** - Each prop has specific semantic meaning
4. **Clear spacing required** - Minimum clear space = height of hat brim on all sides
5. **Transparent backgrounds** - Use for compositing on different UI backgrounds

## Generation Details

These poses are generated using the image-generation skill with:
- Model: `gemini-2.5-flash-image` (cost-effective)
- Reference: `docs/mascot/captain-otter/samples/`
- Background: `transparent` for all poses

To generate or regenerate poses:

```bash
# Install dependencies first (one-time)
cd .claude/skills/image-generation && npm install && cd -

# Generate a pose with transparent background
node .claude/skills/image-generation/scripts/generate.mjs \
  --prompt "Cute river otter in purple (#6C59A4) pilot uniform with gold (#F3CA5C) buttons, [POSE DESCRIPTION], [EXPRESSION], full body, no text, vector art" \
  --ref docs/mascot/captain-otter/samples/ \
  --ratio 1:1 \
  --bg transparent \
  --output-dir docs/mascot/captain-otter/poses \
  --output [filename].png

# Example: Generate success salute pose
node .claude/skills/image-generation/scripts/generate.mjs \
  --prompt "Cute river otter in purple (#6C59A4) pilot uniform with gold (#F3CA5C) buttons, giving a crisp military salute, confident proud expression, full body, no text, vector art" \
  --ref docs/mascot/captain-otter/samples/ \
  --ratio 1:1 \
  --bg transparent \
  --output-dir docs/mascot/captain-otter/poses \
  --output success-salute.png
```
