# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Identity Integrity**: Every `studySets/{setId}` document MUST have `ownerId == request.auth.uid` on creation and `ownerId` MUST remain immutable on updates. Only verified Google users (`email_verified == true`) can create, update, or delete study sets.
2. **Path & ID Alignment**: Every `studySets/{setId}` document ID must match `^[a-zA-Z0-9_\-]+$` (max 128 chars) and equal `data.id`.
3. **Bounded Payload & Type Safety**: `items` must be a non-empty list of 1 to 50 items, `itemCount == items.size()`, and every string field (`title`, `description`, `ownerName`, `en`, `vi`, `emoji`) must enforce strict max lengths.
4. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable; `updatedAt` must equal `request.time` on both create and update.
5. **Visibility & List Isolation**:
   - `public`: Discoverable via `list` queries and readable via `get` link.
   - `unlisted`: Readable via direct `get` share link (`?set={setId}`), NOT exposed in public `list` queries (only owner can list).
   - `private`: Readable (`get` and `list`) ONLY by the owner (`ownerId == request.auth.uid`).
6. **PII Isolation**: No email addresses, phone numbers, or sensitive user PII are stored in `studySets`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Create**: Creating a study set with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating a study set with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: Creating a study set where `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Creating/updating a study set with an extra field (`isFeatured: true`) -> `PERMISSION_DENIED`.
5. **Document ID Poisoning**: Creating `/studySets/bad$id` or `id != setId` -> `PERMISSION_DENIED`.
6. **Empty Items List**: Creating a study set with `items: []` -> `PERMISSION_DENIED`.
7. **Unbounded Array / DoW**: Creating a study set with 51+ items -> `PERMISSION_DENIED`.
8. **Invalid Item Schema**: Creating a study set where `items[0]` is missing `vi` or exceeds `maxLength` -> `PERMISSION_DENIED`.
9. **Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a client-chosen timestamp instead of `request.time` -> `PERMISSION_DENIED`.
10. **Owner Hijack Update**: Non-owner attempting to update someone else's study set -> `PERMISSION_DENIED`.
11. **Immutable Field Mutation**: Owner attempting to change `ownerId`, `id`, or `createdAt` during update -> `PERMISSION_DENIED`.
12. **Private/Unlisted Scraping**: Unauthenticated user or non-owner running a `list` query that could match `unlisted` or `private` sets, or `get` on a `private` set -> `PERMISSION_DENIED`.
