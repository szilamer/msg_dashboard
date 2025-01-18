# Üzenetkezelő Dashboard

## Jelenlegi funkcionalitás

### WhatsApp Integráció
- WhatsApp Web inicializálása Chrome böngészőben
- QR kód beolvasása a mobilalkalmazással
- Chat lista betöltése és megjelenítése
- Olvasatlan üzenetek számának követése
- Utolsó üzenetek megjelenítése
- Valós idejű frissítés

### Technikai részletek
- Backend: Node.js szerver (port: 5000)
  - Puppeteer a WhatsApp Web automatizálásához
  - REST API végpontok a frontend kiszolgálásához
  - Hibakezelés és naplózás
- Frontend: React alkalmazás (port: 3000)
  - Material-UI komponensek
  - Reszponzív felhasználói felület
  - Valós idejű frissítések

## Tervezett fejlesztések

### 1. Több WhatsApp fiók kezelése
- [ ] Több WhatsApp fiók párhuzamos csatlakoztatása
- [ ] Fiókok közötti váltás lehetősége
- [ ] Fiókokhoz tartozó beállítások mentése
- [ ] Fiókszintű értesítések kezelése

### 2. Skype integráció
- [ ] Skype Web API integrálása
- [ ] Bejelentkezés kezelése
- [ ] Chat lista betöltése
- [ ] Üzenetek és értesítések kezelése
- [ ] Olvasatlan üzenetek követése
- [ ] Valós idejű frissítések

### 3. Facebook Messenger integráció
- [ ] Facebook Graph API integrálása
- [ ] OAuth2 bejelentkezés implementálása
- [ ] Chat lista és üzenetek betöltése
- [ ] Olvasatlan üzenetek követése
- [ ] Értesítések kezelése

### 4. Összesített üzenetkezelés
- [ ] Egységes felhasználói felület az összes platformhoz
- [ ] Összesített értesítések megjelenítése
- [ ] Platform-független üzenetszűrés és keresés
- [ ] Statisztikák és jelentések generálása
  - Üzenetek száma platformonként
  - Olvasatlan üzenetek aránya
  - Aktivitási időszakok elemzése

### 5. Adatbázis integráció
- [ ] MongoDB/PostgreSQL adatbázis bevezetése
- [ ] Felhasználói beállítások tárolása
- [ ] Üzenetstatisztikák mentése
- [ ] Platformok hitelesítési adatainak biztonságos tárolása

### 6. Felhasználói felület fejlesztések
- [ ] Dark/Light téma támogatás
- [ ] Testreszabható értesítések
- [ ] Drag-and-drop felület elrendezés
- [ ] Gyorsbillentyűk támogatása
- [ ] Mobilbarát felület

### 7. Biztonság és adatvédelem
- [ ] Végpontok titkosítása (HTTPS)
- [ ] Biztonságos munkamenet kezelés
- [ ] Adatvédelmi beállítások
- [ ] GDPR megfelelőség

## Telepítés és futtatás

### Követelmények
- Node.js 18.x vagy ��jabb
- Google Chrome böngésző
- npm vagy yarn csomagkezelő

### Backend indítása
```bash
npm install
npm run dev
```

### Frontend indítása
```bash
cd frontend
npm install
npm start
```

## Közreműködés
A projekt nyitott a közreműködésre. Kérjük, kövesse a következő lépéseket:
1. Fork-olja a repository-t
2. Hozzon létre egy új branch-et a fejlesztéshez
3. Commit-olja a változtatásokat
4. Push-olja a branch-et
5. Nyisson egy Pull Request-et

## Licensz
MIT License - lásd a LICENSE fájlt a részletekért. 