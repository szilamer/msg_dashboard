# Üzenet Statisztikai Dashboard

Ez a projekt egy dashboard alkalmazás, amely különböző kommunikációs platformok (WhatsApp, Skype, Facebook Messenger, HelpScout) üzenetstatisztikáit jeleníti meg egy helyen.

## Funkciók

- Különböző kommunikációs platformok integrációja
- Valós idejű statisztikák megjelenítése
- Automatikus adatfrissítés
- Reszponzív felhasználói felület

## Technológiák

### Backend
- Python FastAPI
- SQLite adatbázis
- Async/await alapú API kommunikáció

### Frontend
- React
- TypeScript
- Material-UI komponensek
- Axios HTTP kliens

## Telepítés

1. Klónozza le a repository-t:
```bash
git clone [repository URL]
cd msg_api_dashboard
```

2. Telepítse a backend függőségeket:
```bash
cd backend
pip install -r requirements.txt
```

3. Telepítse a frontend függőségeket:
```bash
cd frontend
npm install
```

4. Hozza létre a környezeti változókat:
```bash
cp .env.example .env
```
Töltse ki a megfelelő API kulcsokat és hozzáférési adatokat a `.env` fájlban.

## Futtatás

1. Indítsa el a backend szervert:
```bash
cd backend
uvicorn main:app --reload
```

2. Indítsa el a frontend fejlesztői szervert:
```bash
cd frontend
npm start
```

Az alkalmazás ezután elérhető lesz a `http://localhost:3000` címen.

## API Kulcsok beszerzése

### WhatsApp Business API
- Regisztráljon a WhatsApp Business API-hoz
- Kövesse a Meta dokumentációját a hozzáférés beállításához

### Skype
- Használja a Skype fiók bejelentkezési adatait

### Facebook Messenger
- Hozzon létre egy Facebook alkalmazást
- Kérjen megfelelő jogosultságokat a Messenger API használatához

### HelpScout
- Regisztráljon egy HelpScout fejlesztői fiókot
- Generáljon API kulcsot a HelpScout admin felületén

## Frissítési gyakoriság

Az alkalmazás alapértelmezetten percenként frissíti az adatokat. Ez az érték módosítható a frontend kódban.

# Üzenet API Dashboard - Messenger Integráció Beállítása

## Facebook Messenger Integráció Lépésről Lépésre

### 1. Facebook Fejlesztői Fiók Létrehozása
1. Látogass el a [Facebook Developers](https://developers.facebook.com/) oldalra
2. Jelentkezz be a Facebook fiókoddal
3. Ha még nem tetted meg, regisztrálj fejlesztőként (kattints a "Get Started" gombra)

### 2. Facebook Alkalmazás Létrehozása
1. A fejlesztői dashboardon kattints a "Create App" gombra
2. Válaszd a "Business" típust
3. Add meg az alkalmazás nevét és elérhetőségi e-mail címed
4. Kattints a "Create App" gombra

### 3. Messenger API Beállítása
1. Az alkalmazás dashboardján keresd meg a "Add Products" szekciót
2. Keresd meg a "Messenger" terméket és kattints a "Set Up" gombra
3. A Messenger beállításoknál:
   - Görgess le a "Access Tokens" szekcióhoz
   - Kattints az "Add or Remove Pages" gombra
   - Válaszd ki azt a Facebook oldalt, amihez a Messenger integrációt szeretnéd használni
   - Engedélyezd a kért jogosultságokat
   - A kiválasztott oldalhoz generálódni fog egy Page Access Token

### 4. Szükséges Jogosultságok Beállítása
1. A bal oldali menüben válaszd az "App Settings > Advanced" menüpontot
2. Görgess le a "Security" szekcióhoz
3. Kapcsold be az "Enable API Access" opciót
4. A bal oldali menüben válaszd az "App Review" menüpontot
5. Kérj hozzáférést a következő jogosultságokhoz:
   - `pages_messaging`
   - `pages_messaging_subscriptions`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `pages_read_user_content`

### 5. Access Token Beszerzése
1. Menj vissza a Messenger beállításokhoz
2. A "Access Tokens" szekcióban keresd meg a Facebook oldaladhoz tartozó tokent
3. Kattints a "Generate Token" gombra
4. Másold ki a generált tokent (ez lesz az `access_token`, amit a rendszerben használni fogsz)

### 6. Token Hozzáadása a Rendszerhez
1. A Message API Dashboardon kattints az "Új fiók hozzáadása" gombra
2. Válaszd ki a "Messenger" típust
3. Add meg a fiók nevét (pl. "Cég Messenger")
4. Az `access_token` mezőbe illeszd be a korábban generált tokent
5. Kattints a "Hozzáadás" gombra

### Fontos Megjegyzések
- A Page Access Token általában nem jár le, de biztonsági okokból érdemes időnként újragenerálni
- Az alkalmazásnak "Live" módban kell lennie a működéshez
- A Facebook oldalnak, amihez a Messenger integrációt használod, aktívnak kell lennie
- Az első használat előtt érdemes tesztelni egy üzenetváltással, hogy minden megfelelően működik

### Hibaelhárítás
Ha a statisztikák nem jelennek meg vagy nullát mutatnak:
1. Ellenőrizd, hogy az alkalmazás "Live" módban van-e
2. Ellenőrizd, hogy minden szükséges jogosultság engedélyezve van-e
3. Próbáld meg újragenerálni az access tokent
4. Ellenőrizd a backend logokat a részletes hibaüzenetekért

### Biztonság
- Soha ne oszd meg az access tokent másokkal
- Ne commitold a tokent verziókezelő rendszerbe
- Rendszeresen ellenőrizd az alkalmazás biztonsági beállításait
- Ha bármilyen gyanús aktivitást észlelsz, azonnal generálj új tokent

# WhatsApp Business API Beállítása

## WhatsApp Business API Integráció Lépésről Lépésre

### 1. WhatsApp Business API Hozzáférés Igénylése
1. Látogass el a [Facebook Business Manager](https://business.facebook.com/) oldalra
2. Hozz létre egy Business Manager fiókot, ha még nincs
3. Navigálj a "Beállítások" > "Üzleti eszközök" > "WhatsApp Manager" menüpontba
4. Kattints az "Új telefonszám hozzáadása" gombra

### 2. WhatsApp Business Account (WABA) Létrehozása
1. Kövesd a varázsló lépéseit a WABA létrehozásához
2. Válaszd ki a megfelelő üzleti kategóriát
3. Add meg a céges adatokat
4. Várj a jóváhagyásra (általában 24-48 óra)

### 3. API Hozzáférés Beállítása
1. A WhatsApp Manager felületén:
   - Keresd meg a "API beállítás" szekciót
   - Jegyezd fel a következő adatokat:
     * WABA ID (WhatsApp Business Account azonosító)
     * Phone Number ID (Telefonszám azonosító)
     * API Key (Hozzáférési token)

### 4. Integráció a Dashboard Rendszerbe
1. A Message API Dashboardon kattints az "Új fiók hozzáadása" gombra
2. Válaszd ki a "WhatsApp" típust
3. Add meg a következő adatokat:
   - Fiók neve (pl. "Cég WhatsApp")
   - API kulcs (a WhatsApp Manager-ből)
   - WABA ID
   - Phone Number ID

### Fontos Megjegyzések
- A WhatsApp Business API csak üzleti fiókokhoz érhető el
- Az API kulcsok 24 óránként automatikusan frissülnek
- A rendszer csak a hivatalos WhatsApp Business API-n keresztül kommunikál
- Az üzenetek titkosítva vannak a WhatsApp protokoll szerint

### Hibaelhárítás
Ha a statisztikák nem jelennek meg vagy nullát mutatnak:
1. Ellenőrizd az API kulcs érvényességét
2. Ellenőrizd a WABA és Phone Number ID helyességét
3. Nézd meg a backend logokat a részletes hibaüzenetekért
4. Ellenőrizd a WhatsApp Business Manager felületén az API státuszát

### Biztonság
- Az API kulcsokat biztonságosan tárold
- Rendszeresen ellenőrizd az API hozzáféréseket
- Kövesd a WhatsApp Business API biztonsági irányelveit
- Ne oszd meg az API kulcsokat illetéktelen személyekkel

# HelpScout API Beállítása

## HelpScout Integráció Lépésről Lépésre

### 1. HelpScout API Hozzáférés Létrehozása
1. Jelentkezz be a [HelpScout admin felületére](https://secure.helpscout.net/settings/api)
2. Navigálj az "Apps & API" > "My Apps" menüpontba
3. Kattints az "Create My App" gombra
4. Add meg az alkalmazás nevét (pl. "Üzenet Statisztikák")

### 2. API Kulcs Generálása
1. Az újonnan létrehozott alkalmazásnál:
   - Válaszd az "Authentication" fület
   - Kattints a "Create API Key" gombra
   - Másold ki a generált API kulcsot

### 3. Szükséges Jogosultságok
Az alkalmazásnak a következő jogosultságokra van szüksége:
- `mailbox.read` - Mailboxok olvasása
- `conversations.read` - Beszélgetések olvasása
- `threads.read` - Üzenetszálak olvasása

### 4. Integráció a Dashboard Rendszerbe
1. A Message API Dashboardon kattints az "Új fiók hozzáadása" gombra
2. Válaszd ki a "HelpScout" típust
3. Add meg a következő adatokat:
   - Fiók neve (pl. "Support HelpScout")
   - API kulcs (a HelpScout admin felületéről)

### Fontos Megjegyzések
- Az API kulcs nem jár le, de biztonsági okokból érdemes időnként újragenerálni
- A HelpScout API rate limit-je 200 kérés/10 másodperc
- Az alkalmazás az összes elérhető mailbox statisztikáit összegyűjti
- A beszélgetések státusza és olvasottsági állapota valós időben frissül

### Hibaelhárítás
Ha a statisztikák nem jelennek meg vagy nullát mutatnak:
1. Ellenőrizd az API kulcs érvényességét
2. Ellenőrizd a jogosultságokat az admin felületen
3. Nézd meg a backend logokat a részletes hibaüzenetekért
4. Ellenőrizd, hogy van-e aktív mailbox a fiókban

### Biztonság
- Az API kulcsot biztonságosan tárold
- Ne oszd meg az API kulcsot illetéktelen személyekkel
- Rendszeresen ellenőrizd az API hozzáféréseket
- Ha gyanús aktivitást észlelsz, azonnal generálj új API kulcsot 