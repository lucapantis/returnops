-- The append-only guarantee for "AuditLog" was enforced by BEFORE UPDATE and
-- BEFORE DELETE row-level triggers only. `TRUNCATE` fires neither of those, so
-- the entire trail could still be wiped in a single statement. Add a
-- statement-level BEFORE TRUNCATE trigger that reuses the same guard function.
CREATE TRIGGER "auditlog_no_truncate"
    BEFORE TRUNCATE ON "AuditLog"
    FOR EACH STATEMENT EXECUTE FUNCTION "auditlog_block_mutation"();
