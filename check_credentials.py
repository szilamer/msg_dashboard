import sqlite3
import json

conn = sqlite3.connect('messages.db')
c = conn.cursor()
c.execute("SELECT id, account_type, account_name, credentials FROM accounts WHERE account_type='HelpScout' AND is_active=TRUE")
rows = c.fetchall()
conn.close()

for row in rows:
    print(f"ID: {row[0]}")
    print(f"Type: {row[1]}")
    print(f"Name: {row[2]}")
    print(f"Credentials: {row[3]}")
    try:
        creds = json.loads(row[3])
        print(f"Parsed credentials:")
        print(f"  client_id: {creds.get('client_id')}")
        print(f"  client_secret: {creds.get('client_secret')}")
    except json.JSONDecodeError:
        print("Failed to parse credentials JSON") 