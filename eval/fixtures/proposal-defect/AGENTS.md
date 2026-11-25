# records

Rules for every change here:

1. Nothing writes to `data/` directly. All writes go through `src/store.mjs`, which keeps a backup and a
   journal so a failed write can be rolled back.
2. A change that touches stored records needs a test that proves the rollback path.

```factory
test: node --test
```
