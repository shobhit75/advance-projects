# 📦 Migration Guide: SQLite to Neon PostgreSQL

If you're upgrading from the SQLite version of this app, this guide will help you migrate your data.

## What Changed?

### Database Changes
- ✅ Moved from SQLite (`go_together.db`) to Neon PostgreSQL (cloud database)
- ✅ Better performance and scalability
- ✅ Access your data from anywhere
- ✅ No more local database file

### Feature Changes
- ✅ **NEW**: Host unique ID now displayed on response cards
- ✅ All existing features preserved
- ✅ Same user interface

## Option 1: Start Fresh (Recommended for Testing)

The easiest way is to start with a clean Neon database:

1. Set up Neon as described in QUICKSTART.md
2. Run the app - it will create empty tables
3. Re-register users and recreate plans

**This is recommended if:**
- You were just testing the SQLite version
- You don't have important data to preserve
- You want the cleanest setup

## Option 2: Migrate Your Data

If you have important data in SQLite, follow these steps:

### Prerequisites
```bash
pip install sqlite3  # Usually comes with Python
pip install psycopg2-binary  # Should already be installed
```

### Step 1: Export from SQLite

Create a file `export_sqlite.py`:

```python
import sqlite3
import json

# Connect to SQLite
conn = sqlite3.connect('go_together.db')
cursor = conn.cursor()

# Export all tables
tables = ['users', 'friendships', 'plans', 'sections', 'xmarks', 'plan_responses', 'notifications']
data = {}

for table in tables:
    cursor.execute(f"SELECT * FROM {table}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    data[table] = {
        'columns': columns,
        'rows': rows
    }

# Save to JSON
with open('data_export.json', 'w') as f:
    json.dump(data, f, indent=2)

conn.close()
print("✅ Data exported to data_export.json")
```

Run it:
```bash
python export_sqlite.py
```

### Step 2: Import to Neon

Create a file `import_to_neon.py`:

```python
import psycopg2
import json
import os

# Get Neon connection string
connection_string = os.getenv('NEON_DATABASE_URL')
if not connection_string:
    print("❌ Please set NEON_DATABASE_URL environment variable")
    exit(1)

# Connect to Neon
conn = psycopg2.connect(connection_string)
cursor = conn.cursor()

# Load exported data
with open('data_export.json', 'r') as f:
    data = json.load(f)

# Import data (excluding auto-increment IDs for new inserts)
for table, table_data in data.items():
    columns = table_data['columns']
    rows = table_data['rows']
    
    if not rows:
        print(f"⏭️  Skipping empty table: {table}")
        continue
    
    # Create placeholders for INSERT
    placeholders = ','.join(['%s'] * len(columns))
    column_names = ','.join(columns)
    
    for row in rows:
        try:
            cursor.execute(
                f"INSERT INTO {table} ({column_names}) VALUES ({placeholders})",
                row
            )
        except Exception as e:
            print(f"⚠️  Error inserting into {table}: {e}")
            conn.rollback()
            continue
    
    conn.commit()
    print(f"✅ Imported {len(rows)} rows into {table}")

# Update sequences for auto-increment columns
for table in data.keys():
    try:
        cursor.execute(f"SELECT MAX(id) FROM {table}")
        max_id = cursor.fetchone()[0]
        if max_id:
            cursor.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), {max_id})")
            conn.commit()
            print(f"✅ Updated sequence for {table}")
    except Exception as e:
        print(f"⚠️  Could not update sequence for {table}: {e}")

cursor.close()
conn.close()
print("\n🎉 Migration complete!")
```

Run it:
```bash
python import_to_neon.py
```

### Step 3: Verify Migration

1. Run the updated app: `python main.py`
2. Log in with your existing credentials
3. Verify your:
   - User accounts
   - Friends
   - Plans
   - Responses

## Common Issues

### "Duplicate key error"
- Your Neon database already has data
- Solution: Drop and recreate tables, or use a fresh Neon project

### "Connection timeout"
- Check your internet connection
- Verify NEON_DATABASE_URL is correct
- Ensure your Neon project is active

### "Permission denied"
- Make sure your connection string includes the correct credentials
- Check if IP allowlist is configured in Neon (if applicable)

## Rollback Plan

If migration fails, you still have your original SQLite database:
1. Your `go_together.db` file is unchanged
2. You can continue using the old SQLite version
3. Try migration again when ready

## Post-Migration

After successful migration:

1. ✅ Keep your `go_together.db` as backup for a while
2. ✅ Update all users about the new cloud-based system
3. ✅ Enjoy the improved performance and HOST ID visibility!
4. ✅ Take advantage of cloud access

## Need Help?

- Check README.md for full documentation
- Review QUICKSTART.md for setup basics
- Verify your Neon connection at https://console.neon.tech/

**Happy migrating! 🚀**
