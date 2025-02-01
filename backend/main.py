import os
import logging
import sys

# Adatbázis elérési út beállítása
if os.environ.get('RENDER'):
    DB_DIR = '/opt/render/project/src'
else:
    DB_DIR = os.path.dirname(__file__)

# Logging beállítása
log_file = os.path.join(DB_DIR, 'debug.log')
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file, mode='a', encoding='utf-8')
    ]
)

# Logger létrehozása
logger = logging.getLogger('msg_api')
logger.setLevel(logging.DEBUG)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from typing import List, Optional
from datetime import datetime
import sqlite3
import json
from services import update_account_stats

# Explicit export for Gunicorn
app = FastAPI()

# CORS beállítások
origins = [
    "https://msg-dashboard-2ku2.onrender.com",  # Frontend URL
    "http://localhost:3000",  # Lokális fejlesztéshez
    "http://localhost:5000"   # Lokális fejlesztéshez
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "API is running"}

# Adatbázis inicializálás
def init_db():
    db_path = os.path.join(DB_DIR, 'messages.db')
    logger.info(f"Initializing database at: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
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
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
    finally:
        conn.close()
    return db_path

# Globális változó az adatbázis elérési útjához
DB_PATH = init_db()

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
    conn = sqlite3.connect(DB_PATH)
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
    conn = sqlite3.connect(DB_PATH)
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
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        # Ellenőrizzük, hogy létezik-e a fiók
        c.execute("SELECT id FROM accounts WHERE id = ?", (account_id,))
        if not c.fetchone():
            raise HTTPException(status_code=404, detail="A fiók nem található")
            
        # Töröljük a statisztikákat
        c.execute("DELETE FROM account_stats WHERE account_id = ?", (account_id,))
        
        # Inaktiváljuk a fiókot
        c.execute("UPDATE accounts SET is_active = FALSE WHERE id = ?", (account_id,))
        
        conn.commit()
        return {"message": "A fiók sikeresen törölve"}
    except sqlite3.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Adatbázis hiba: {str(e)}")
    except HTTPException as e:
        raise e
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Váratlan hiba történt: {str(e)}")
    finally:
        conn.close()

@app.get("/stats", response_model=List[AccountStats])
async def get_stats():
    conn = sqlite3.connect(DB_PATH)
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
    logger.info("=== Starting stats refresh ===")
    try:
        # Ellenőrizzük az aktív fiókokat
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, account_type, account_name, credentials FROM accounts WHERE is_active = TRUE")
        accounts = c.fetchall()
        logger.info(f"Found {len(accounts)} active accounts")
        
        for account in accounts:
            logger.info(f"Account details:")
            logger.info(f"ID: {account[0]}")
            logger.info(f"Type: {account[1]}")
            logger.info(f"Name: {account[2]}")
            logger.debug(f"Credentials: {account[3]}")
        
        conn.close()
        
        logger.info("Starting update_account_stats...")
        await update_account_stats()
        logger.info("Stats refresh completed successfully")
        return {"message": "Stats refresh completed"}
    except Exception as e:
        logger.error(f"Error during stats refresh: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 