ALTER TABLE preferences ALTER COLUMN version TYPE bigint;
ALTER TABLE preferences ADD CHECK (version <= 9007199254740991);
