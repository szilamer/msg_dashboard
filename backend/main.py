from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from typing import List, Optional
from datetime import datetime
import sqlite3
import os
import json
from services import update_account_stats

app = FastAPI()

# CORS beállítások
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Csak a frontend origin
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Adatbázis inicializálás
def init_db():
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_type TEXT NOT NULL,
            account_name TEXT NOT NULL,
            credentials TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS account_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            total_messages INTEGER,
            unread_messages INTEGER,
            last_unread_date TEXT,
            last_updated TEXT,
            FOREIGN KEY (account_id) REFERENCES accounts(id)
        )
    ''')
    conn.commit()
    conn.close()

# Modellek
class AccountBase(BaseModel):
    account_type: str
    account_name: str
    credentials: dict

class Account(AccountBase):
    id: int
    is_active: bool
    created_at: str

class AccountStats(BaseModel):
    account_id: int
    account_name: str
    account_type: str
    total_messages: int
    unread_messages: int
    last_unread_date: Optional[str]
    last_updated: str

@app.on_event("startup")
async def startup_event():
    init_db()

@app.post("/accounts", response_model=Account)
async def create_account(account: AccountBase):
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    now = datetime.now().isoformat()
    
    try:
        # Validáljuk a credentials formátumát
        if not isinstance(account.credentials, dict):
            raise HTTPException(status_code=400, detail="A credentials mezőnek szótárnak kell lennie")
        
        # Ellenőrizzük a kötelező mezőket
        if not account.account_type or not account.account_name:
            raise HTTPException(status_code=400, detail="A fiók típusa és neve kötelező")
            
        # Mentsük a credentials-t JSON formátumban
        credentials_json = json.dumps(account.credentials)
        
        c.execute(
            "INSERT INTO accounts (account_type, account_name, credentials, created_at) VALUES (?, ?, ?, ?)",
            (account.account_type, account.account_name, credentials_json, now)
        )
        account_id = c.lastrowid
        conn.commit()
        
        # Inicializáljuk az account_stats táblát is
        c.execute(
            "INSERT INTO account_stats (account_id, total_messages, unread_messages, last_updated) VALUES (?, 0, 0, ?)",
            (account_id, now)
        )
        conn.commit()
        
        return {
            "id": account_id,
            "account_type": account.account_type,
            "account_name": account.account_name,
            "credentials": account.credentials,
            "is_active": True,
            "created_at": now
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Adatbázis hiba: {str(e)}")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Váratlan hiba történt: {str(e)}")
    finally:
        conn.close()

@app.get("/accounts", response_model=List[Account])
async def get_accounts():
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("SELECT id, account_type, account_name, credentials, is_active, created_at FROM accounts WHERE is_active = TRUE")
    rows = c.fetchall()
    conn.close()
    
    return [
        Account(
            id=row[0],
            account_type=row[1],
            account_name=row[2],
            credentials=eval(row[3]),
            is_active=row[4],
            created_at=row[5]
        ) for row in rows
    ]

@app.delete("/accounts/{account_id}")
async def delete_account(account_id: int):
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    try:
        c.execute("UPDATE accounts SET is_active = FALSE WHERE id = ?", (account_id,))
        conn.commit()
        return {"message": "Account successfully deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/stats", response_model=List[AccountStats])
async def get_stats():
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("""
        SELECT 
            s.account_id,
            a.account_name,
            a.account_type,
            s.total_messages,
            s.unread_messages,
            s.last_unread_date,
            s.last_updated
        FROM account_stats s
        JOIN accounts a ON s.account_id = a.id
        WHERE a.is_active = TRUE
    """)
    rows = c.fetchall()
    conn.close()
    
    return [
        AccountStats(
            account_id=row[0],
            account_name=row[1],
            account_type=row[2],
            total_messages=row[3],
            unread_messages=row[4],
            last_unread_date=row[5],
            last_updated=row[6]
        ) for row in rows
    ]

@app.post("/stats/refresh")
async def refresh_stats():
    print("Starting stats refresh...")
    try:
        await update_account_stats()
        print("Stats refresh completed successfully")
        return {"message": "Stats refresh completed"}
    except Exception as e:
        print(f"Error during stats refresh: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 