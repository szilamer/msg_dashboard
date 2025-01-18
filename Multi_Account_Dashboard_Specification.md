
# Többfiókos Kommunikációs Dashboard Specifikáció

Ez a dokumentum részletes specifikációt nyújt egy olyan rendszerről, amely egyszerre több kommunikációs fiókot kezel (pl. Skype, WhatsApp Web, Facebook Messenger), és azok adatait egy központi dashboardon jeleníti meg.

---

## **Rendszer Áttekintése**

### **Főbb Funkciók**
1. **Több fiók kezelése**:
   - Támogatás több böngésző-példány egyidejű futtatásához, így egyszerre több fiók (különböző platformokon) monitorozható.
2. **Adatgyűjtés**:
   - Beérkező üzenetek száma.
   - Olvasatlan üzenetek száma.
   - Olvasott üzenetek száma.
   - Legrégebbi üzenet időbélyege.
3. **Dashboard**:
   - A fiókokhoz tartozó összes adat valós idejű megjelenítése.
4. **Skálázhatóság**:
   - Rugalmasan bővíthető további platformokkal.

### **Architektúra**
1. **Böngésző Automatizáció (Puppeteer vagy Selenium)**:
   - Minden fiókhoz külön böngésző-példány.
2. **Adatgyűjtő Modul**:
   - Platformspecifikus adatgyűjtés (pl. WhatsApp, Messenger).
3. **Backend API**:
   - Node.js alapú backend az adatok összesítésére és kiszolgálására.
4. **Frontend Dashboard**:
   - React alapú frontend, amely megjeleníti a backend által összesített adatokat.

---

## **Rendszer Működése**

1. **Fiók hozzáadása**:
   - A felhasználó elindítja az alkalmazást, kiválasztja a platformot, és bejelentkezik.
2. **Adatgyűjtés**:
   - Az automatizált böngésző monitorozza az adott platform üzeneteit.
3. **Adatok összesítése**:
   - A backend aggregálja az adatokat és REST API-n keresztül elérhetővé teszi.
4. **Adatok megjelenítése**:
   - A frontend dashboard a platformok fiókjainak adatait valós időben jeleníti meg.

---

## **Specifikáció Platformonként**

### **WhatsApp Web**
- **Elemek azonosítása**:
  - Bal oldali lista: `#pane-side`
  - Olvasatlan üzenetek: `.P6z4j`
  - Időbélyeg: `._3Bxar`

#### **Kódvázlat** (Puppeteer):
```javascript
const scrapeWhatsApp = async (page) => {
    await page.waitForSelector('#pane-side');
    const chats = await page.evaluate(() => {
        const chatElements = document.querySelectorAll('#pane-side ._1pJ9J');
        return Array.from(chatElements).map(chat => {
            const name = chat.querySelector('._3CneP').innerText;
            const unreadCount = chat.querySelector('.P6z4j')?.innerText || 0;
            const timestamp = chat.querySelector('._3Bxar')?.innerText || '';
            return { name, unreadCount, timestamp };
        });
    });
    return { chats };
};
```

---

### **Facebook Messenger**
- **Elemek azonosítása**:
  - Chat lista: `[role="grid"]`
  - Olvasatlan jelző: `.unread-badge`
  - Időbélyeg: `.time-stamp`

#### **Kódvázlat** (Puppeteer):
```javascript
const scrapeMessenger = async (page) => {
    await page.waitForSelector('[role="grid"]');
    const chats = await page.evaluate(() => {
        const chatElements = document.querySelectorAll('[role="grid"] [role="row"]');
        return Array.from(chatElements).map(chat => {
            const name = chat.querySelector('[role="link"] > span')?.innerText || 'Unknown';
            const unreadCount = chat.querySelector('.unread-badge')?.innerText || 0;
            const timestamp = chat.querySelector('.time-stamp')?.innerText || '';
            return { name, unreadCount, timestamp };
        });
    });
    return { chats };
};
```

---

### **Skype**
- **Elemek azonosítása**:
  - Chat lista: `.recentItem`
  - Olvasatlan jelző: `.badge`
  - Időbélyeg: `.time`

#### **Kódvázlat** (Selenium):
```python
from selenium import webdriver
from selenium.webdriver.common.by import By

def scrape_skype():
    driver = webdriver.Chrome()
    driver.get('https://web.skype.com')

    print('Log in to your Skype account.')
    driver.implicitly_wait(60)

    chats = driver.find_elements(By.CLASS_NAME, 'recentItem')
    results = []
    for chat in chats:
        name = chat.find_element(By.CLASS_NAME, 'participantName').text
        unread_count = chat.find_element(By.CLASS_NAME, 'badge').text if chat.find_elements(By.CLASS_NAME, 'badge') else 0
        timestamp = chat.find_element(By.CLASS_NAME, 'time').text
        results.append({'name': name, 'unread_count': unread_count, 'timestamp': timestamp})

    print('Skype chats:', results)
    driver.quit()
```

---

## **Backend API**

A backend Node.js alapú, amely a platformok adatait összegyűjti és kiszolgálja a frontendnek.

#### **Backend Kódvázlat**
```javascript
const express = require('express');
const app = express();

let accountData = [];

app.get('/api/dashboard', (req, res) => {
    res.json(accountData);
});

const updateAccountData = async () => {
    const results = await Promise.all(accounts.map(scrapeAccount));
    accountData = results;
};

setInterval(updateAccountData, 300000); // 5 percenként frissítés
app.listen(5000, () => console.log('Backend API fut a 5000-es porton'));
```

---

## **Frontend Dashboard**

A React alapú frontend a backend API adatait jeleníti meg valós időben.

#### **Frontend Kódvázlat**
```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/dashboard');
        setData(response.data);
      } catch (err) {
        console.error('Hiba a dashboard adatok lekérésekor:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 percenként frissítés
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Kommunikációs Dashboard</h1>
      {data.map((account, index) => (
        <div key={index}>
          <h2>{account.platform}</h2>
          <ul>
            {account.data.chats.map((chat, i) => (
              <li key={i}>
                <strong>{chat.name}</strong> - Olvasatlan: {chat.unreadCount}, Idő: {chat.timestamp}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
```

---

## **Fontos Megfontolások**

1. **Session Management**:
   - Minden böngésző-példányhoz külön session szükséges.
   - Ha egy session lejár, automatikusan újra kell indítani.

2. **Biztonság**:
   - HTTPS és titkosítás használata.
   - Hitelesítési adatok biztonságos tárolása.

3. **Karbantartás**:
   - A platformok felületi frissítésekor a szelektorokat újra kell definiálni.

4. **Skálázhatóság**:
   - Nagy számú fiók esetén dedikált szerverek használata javasolt.

---

## **Következtetés**

Ez a rendszer egyszerre képes több fiók monitorozására, az adatok összesítésére és megjelenítésére egy központi dashboardon. A megoldás könnyen bővíthető további platformokkal és biztosítja a szükséges funkcionalitást mind a skálázhatóság, mind a rugalmasság szempontjából.
