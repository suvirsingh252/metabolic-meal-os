# Investor Demo Runbook

Last updated: 2026-06-26

## Pre-Meeting Gate

Do not start the investor demo until these checks pass in the exact environment you will present:

- No banner says `Hearth is private by default`.
- `npm run investor-demo:audit` completes with real totals.
- Image coverage is high enough for visual browsing.
- Tonight has a lead dinner recommendation.
- Meals has a populated recipe library.
- Planner has the current week loaded.
- Grocery has either a saved list or can generate one from planned meals.
- At least one known recipe detail page opens with an image, ingredients, instructions, and nutrition.

If any check fails, use the backup walkthrough below and be explicit that the current environment is not connected to production content.

## Exact Demo Sequence

1. Open **Tonight** (`/`).
   - Click one refinement chip if useful.
   - Say: "Hearth starts with a confident dinner decision from meals this household has already saved, not a blank AI prompt."
   - Show the lead pick, two alternatives, badges, and why-this-meal copy.

2. Open **Meals**.
   - Search or filter to a visually strong recipe.
   - Say: "The recipe library is the memory layer. Every saved recipe keeps source context, image, nutrition, and household-ready details."
   - Click a polished recipe card.

3. On **Recipe Detail**.
   - Show the hero image, ingredients, instructions, nutrition, and original recipe link.
   - Say: "The original recipe stays preserved, while Hearth layers household notes and practical cooking memory on top."

4. Open **Planner**.
   - Show the current week.
   - Add or review meals in the week slots.
   - Say: "Planning is grounded in the same saved meals, so the week is practical instead of generated from scratch."

5. Open **Shop**.
   - Generate or review the grocery list.
   - Say: "The shopping list consolidates planned meals into categories and normalizes ingredient alternatives like scallions and green onions."

6. Open **Insights**.
   - Show nutrition, meal quality, source mix, and recent meals.
   - Say: "Insights are based on saved meal data and nutrition provenance, so the product can explain what it knows and what is missing."

7. Open **Analyze**.
   - Paste a reliable recipe URL or a short recipe text sample.
   - Say: "This is the intake path. Hearth extracts the recipe, reviews nutrition, and saves it back into the same library."

## Recipe Import Backup Path

If URL import fails because a publisher blocks automated reading:

1. Keep the original URL in the input.
2. Paste visible ingredients and instructions below it.
3. Run Analyze again.
4. Say: "Some publishers block server-side recipe reads. The fallback is intentionally simple: paste the visible recipe text and Hearth keeps the source attached."

Use a known-good pasted sample if live network import is unreliable:

```text
Chana masala with chickpeas, tomatoes, onion, garlic, ginger, garam masala, cumin, coriander, and basmati rice. Simmer the aromatics and spices, add chickpeas and tomatoes, cook until thick, and serve with rice and yogurt.
```

## Known Limitations

- This checkout currently lacks usable Notion credentials, so live recipe totals, image coverage, and demo-ready recipe lists cannot be audited locally.
- Prep time, cook time, and servings are not currently exposed through the `MealSummary` audit surface.
- Image backfill depends on existing source image metadata, configured Notion access, OpenAI image generation, and durable image storage.
- Social/video recipe imports depend on accessible caption or metadata; blocked platforms may require pasted recipe text.
- Do not present from a local environment showing private-mode or missing-credential warnings.

## Final Pre-Meeting Checklist

- Run `npm run investor-demo:audit`.
- Run `npm run images:backfill` in dry-run mode and review candidates.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run build`.
- Open the demo environment on an iPhone-sized viewport and confirm no horizontal overflow, clipped buttons, nav ellipses, or empty primary screens.
- Pick one known recipe detail URL as the anchor recipe before the meeting.
- Keep one pasted recipe sample ready for Analyze fallback.
- Do not commit, deploy, or mutate production content during the meeting.
