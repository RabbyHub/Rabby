---
name: rabby-i18n-translation
description: When updating `_raw/locales` translation files in the Rabby repository, backfill only non-skipped English leaf keys that are missing or empty in other locales, preserve placeholders, and respect `__skip_translation` markers.
metadata:
  short-description: Rabby i18n translation backfill rules
---

# Rabby I18n Translation

Use this playbook when editing locale JSON files under:

- `_raw/locales/*/messages.json`

When adding or removing a supported language, also update:

- `_raw/locales/index.json`

The browser extension manifest locale files under `_raw/_locales/*/messages.json` use Chrome `message`/`description` objects. Edit them only when the task explicitly targets extension manifest metadata, and preserve that object shape.

## Scope

Backfill only leaf string keys where English has a non-empty value and the target locale either:

- does not have the key
- has the key with an empty string value

Do not rewrite existing non-empty translations during a missing-key backfill.

## Skip Rules

Always evaluate `__skip_translation` before deciding what is missing.

1. `__skip_translation: true`

   The entire object is excluded from translation. Do not add, translate, or count any descendant leaf key in that object.

2. `__skip_translation: ["keyA", "keyB"]`

   The listed direct child keys are excluded from translation. Do not add, translate, or count those keys, including their descendants if a listed key is an object.

3. The `__skip_translation` marker itself is metadata.

   Do not translate it, copy it into other locale files, or count it as a missing user-facing key.

## Quality Rules

- Preserve interpolation placeholders exactly, such as `{{market}}`, `{{count}}`, and numbered placeholders.
- Preserve React-i18next tags exactly, such as `<1>...</1>` and named tags such as `<bold>...</bold>`.
- Keep product names and protocol terms stable unless the locale already has a consistent localized form.
- Keep common crypto abbreviations such as `APY`, `TVL`, `LTV`, `DeFi`, `DEX`, `NFT`, `RWA`, `TP`, `SL`, and `LIQ` untranslated when they are intentionally marked as skipped or used as industry labels.
- Match the surrounding locale's tone and terminology before adding new translations.

## Validation

After edits:

1. Parse every `_raw/locales/*/messages.json` file with `JSON.parse`.
2. Compare every non-skipped English leaf string against each target locale and verify no non-skipped key is missing or empty.
3. Verify placeholder sets match between English and every translated value.
4. Run `git diff --check`.

For locale-only JSON changes, the full app typecheck and Jest suite can be skipped if no TypeScript or import graph changed; state that explicitly in the handoff.
