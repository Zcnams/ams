# Security Specification: AssetPulse

## 1. Data Invariants
- An Asset must contain non-empty assetTag, name, category, status, condition, location, valid numeric purchaseCost, and createdAt.
- An Audit Log is immutable once written and must reference an existing asset ID and action.
- A Maintenance Record must contain assetId, title, valid type, cost >= 0, valid status, and scheduledDate.
- Timestamps must not be arbitrarily back-dated or malformed.
- Unauthorized users cannot access, tamper, or inject shadow fields into assets or logs.
- Admin user: `zecannice@gmail.com`.

## 2. Dirty Dozen Attack Payloads
1. Attempt to inject a 10MB string payload into assetTag or name.
2. Attempt to write an invalid asset status (e.g. `status: "StolenByHacker"`).
3. Attempt to inject shadow field `isAdmin: true` into an asset document.
4. Attempt to write negative purchaseCost (`-5000000`).
5. Attempt to overwrite immutable `createdAt` timestamp during asset update.
6. Attempt to modify or delete audit log records (violating append-only immutability).
7. Attempt unauthenticated write to `/assets/{assetId}`.
8. Attempt unauthenticated write to `/maintenance/{recordId}`.
9. Attempt to create an asset with an invalid document ID (e.g. non-alphanumeric special characters > 128 chars).
10. Attempt to spoof `createdBy` UID during document creation.
11. Attempt to update maintenance record with invalid status transition or non-numeric cost.
12. Attempt to bypass field boundaries by setting excessively long notes string (> 1000 characters).

## 3. Test Invariant Enforcements
All Dirty Dozen payloads must receive PERMISSION_DENIED.
