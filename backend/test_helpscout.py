import requests
import base64
import json
from datetime import datetime

def test_helpscout():
    client_id = 'HWOKUH5ayNvLWMYjTmWDq1Kh1WjMy2Af'
    client_secret = 'z0BafUPD4NICZ5xeefDnlugmUPal231r'
    
    print("=== HelpScout API Test ===")
    
    # OAuth token beszerzése
    print("\nOAuth token beszerzése...")
    token_url = 'https://api.helpscout.net/v2/oauth2/token'
    
    auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    token_headers = {
        'Authorization': f'Basic {auth_str}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    token_data = {
        'grant_type': 'client_credentials'
    }
    
    try:
        token_response = requests.post(token_url, headers=token_headers, data=token_data)
        print(f"Token válasz státusz: {token_response.status_code}")
        
        if token_response.status_code == 200:
            access_token = token_response.json().get('access_token')
            print(f"\nToken megszerezve: {access_token[:10]}...")
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Aktív beszélgetések lekérése
            print("\nAktív beszélgetések lekérése...")
            active_conversations = requests.get(
                'https://api.helpscout.net/v2/conversations',
                headers=headers,
                params={
                    'status': 'active',
                    'embed': 'threads',
                    'pageSize': 50
                }
            )
            
            if active_conversations.status_code == 200:
                active_data = active_conversations.json()
                total_active = active_data.get('page', {}).get('totalElements', 0)
                conversations = active_data.get('_embedded', {}).get('conversations', [])
                print(f"\nAktív beszélgetések száma: {total_active}")
                
                unread_count = 0
                oldest_unread = None
                
                # Részletes információk kiírása minden beszélgetésről
                for conv in conversations:
                    conv_id = conv.get('id')
                    threads = conv.get('_embedded', {}).get('threads', [])
                    is_unread = False
                    
                    # Ellenőrizzük a thread-eket
                    for thread in threads:
                        if not thread.get('seenByAgent', False):
                            is_unread = True
                            if oldest_unread is None or thread.get('createdAt', '') < oldest_unread.get('createdAt', ''):
                                oldest_unread = thread
                    
                    if is_unread:
                        unread_count += 1
                    
                    print(f"\nBeszélgetés ID: {conv_id}")
                    print(f"Státusz: {conv.get('status')}")
                    print(f"Olvasatlan: {'Igen' if is_unread else 'Nem'}")
                    print(f"Létrehozva: {conv.get('createdAt')}")
                    print(f"Utoljára módosítva: {conv.get('modifiedAt')}")
                    print(f"Thread-ek száma: {len(threads)}")
                
                print(f"\nOlvasatlan beszélgetések száma: {unread_count}")
                if oldest_unread:
                    print(f"Legrégebbi olvasatlan üzenet dátuma: {oldest_unread.get('createdAt')}")
                    print(f"Beszélgetés ID: {oldest_unread.get('id')}")
                else:
                    print("Nincs olvasatlan üzenet")
            else:
                print(f"Hiba az aktív beszélgetések lekérésénél: {active_conversations.status_code}")
        
    except Exception as e:
        print(f"Hiba: {str(e)}")

if __name__ == "__main__":
    test_helpscout() 