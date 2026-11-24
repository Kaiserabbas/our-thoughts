# Category Migration

The application uses JSON snapshots and an encrypted cloud vault, not a relational database.

## Applied scope

- 165 bundled thoughts were migrated.
- 165 IDs and all subject, description, creation-date, modification-date, and formatting fields were preserved.
- Each thought retains `legacyCategory` as the audit/rollback value.
- `subcategory` remains the classification leaf.
- `category` is now the hierarchy main category.
- 160 thoughts received a taxonomy mapping.
- 5 `متفرق خیالات` thoughts remain in `General & Miscellaneous` for manual review.

## Safety

The pre-migration snapshot is in `backups/initialData-<timestamp>.json`.

```powershell
npm run migrate:categories
npm run migrate:categories:apply
```

The first command is always a dry run. The apply command creates a timestamped backup before writing `src/initialData.json`.

The live encrypted KV vault is not modified by these commands. Back up and restore the vault from the application's Settings screen before rolling out to devices.
