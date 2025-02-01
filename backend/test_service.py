import asyncio
import logging
from services import HelpScoutService

# Logging beállítása
logging.basicConfig(level=logging.DEBUG)

async def test_helpscout_service():
    # Teszt fiók létrehozása
    account_id = 1
    credentials = {
        'client_id': 'HWOKUH5ayNvLWMYjTmWDq1Kh1WjMy2Af',
        'client_secret': 'z0BafUPD4NICZ5xeefDnlugmUPal231r'
    }
    
    # Service példányosítása
    service = HelpScoutService(account_id, credentials)
    
    # Statisztikák lekérése
    await service.get_stats()

if __name__ == "__main__":
    # Aszinkron függvény futtatása
    asyncio.run(test_helpscout_service()) 