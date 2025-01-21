import os
from abc import ABC, abstractmethod
from datetime import datetime
import sqlite3
import requests
from skpy import Skype
from facebook import GraphAPI
import aiohttp
import asyncio
import json

class MessageService(ABC):
    def __init__(self, account_id: int, credentials: dict):
        self.account_id = account_id
        self.credentials = credentials

    @abstractmethod
    async def get_stats(self):
        pass

    def save_stats(self, total_messages: int, unread_messages: int, oldest_unread_date: str):
        conn = sqlite3.connect('messages.db')
        c = conn.cursor()
        now = datetime.now().isoformat()
        
        c.execute('''
            INSERT OR REPLACE INTO account_stats 
            (account_id, total_messages, unread_messages, last_unread_date, last_updated)
            VALUES (?, ?, ?, ?, ?)
        ''', (self.account_id, total_messages, unread_messages, oldest_unread_date, now))
        
        conn.commit()
        conn.close()

class WhatsAppService(MessageService):
    async def get_stats(self):
        try:
            print(f"Connecting to WhatsApp Business API...")
            headers = {
                "Authorization": f"Bearer {self.credentials['api_key']}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                # Business Account információk lekérése
                base_url = "https://graph.facebook.com/v17.0"
                waba_id = self.credentials['waba_id']
                phone_number_id = self.credentials['phone_number_id']
                
                # Összes üzenet lekérése
                messages_url = f"{base_url}/{phone_number_id}/messages"
                async with session.get(messages_url, headers=headers) as response:
                    if response.status == 200:
                        messages_data = await response.json()
                        total_messages = len(messages_data.get('data', []))
                    else:
                        print(f"Error fetching messages: {await response.text()}")
                        total_messages = 0
                
                # Olvasatlan üzenetek lekérése
                conversations_url = f"{base_url}/{phone_number_id}/conversations"
                async with session.get(conversations_url, headers=headers) as response:
                    if response.status == 200:
                        conversations_data = await response.json()
                        unread_messages = sum(
                            conv.get('unread_count', 0) 
                            for conv in conversations_data.get('data', [])
                        )
                        
                        # Legrégebbi olvasatlan üzenet dátuma
                        oldest_unread_date = None
                        for conv in conversations_data.get('data', []):
                            if conv.get('unread_count', 0) > 0:
                                updated_time = conv.get('updated_time')
                                if updated_time:
                                    if oldest_unread_date is None or updated_time < oldest_unread_date:
                                        oldest_unread_date = updated_time
                    else:
                        print(f"Error fetching conversations: {await response.text()}")
                        unread_messages = 0
                        oldest_unread_date = None
                
                print(f"WhatsApp stats - Total: {total_messages}, Unread: {unread_messages}, Oldest unread: {oldest_unread_date}")
                self.save_stats(total_messages, unread_messages, oldest_unread_date)
                
        except Exception as e:
            print(f"Error getting WhatsApp stats: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            # Hiba esetén nullázzuk az értékeket
            self.save_stats(0, 0, None)

class SkypeService(MessageService):
    async def get_stats(self):
        try:
            print(f"Attempting to connect to Skype with username: {self.credentials['username']}")
            sk = Skype(self.credentials['username'], self.credentials['password'])
            print("Successfully connected to Skype")
            
            # Összes üzenet és olvasatlan üzenetek számolása
            total_messages = 0
            unread_messages = 0
            oldest_unread_date = None
            
            # Végigmegyünk az összes chaten
            print("Fetching recent chats...")
            chats = sk.chats.recent()
            print(f"Found chats, processing...")
            
            for chat_id, chat in chats.items():
                try:
                    print(f"Processing chat: {chat_id}")
                    # Csak a SkypeChat típusú objektumokat dolgozzuk fel
                    if hasattr(chat, 'getMsgs'):
                        messages = list(chat.getMsgs())
                        print(f"Found {len(messages)} messages in chat")
                        total_messages += len(messages)
                        
                        # Olvasatlan üzenetek kezelése
                        for msg in messages:
                            if hasattr(msg, 'read') and not msg.read:
                                unread_messages += 1
                                # Frissítjük az utolsó olvasatlan üzenet dátumát
                                if hasattr(msg, 'time'):
                                    msg_date = msg.time.isoformat() if msg.time else None
                                    if msg_date:
                                        if oldest_unread_date is None or msg_date < oldest_unread_date:
                                            oldest_unread_date = msg_date
                except Exception as chat_error:
                    print(f"Error processing chat {chat_id}: {str(chat_error)}")
                    continue
            
            print(f"Final stats - Total messages: {total_messages}, Unread: {unread_messages}, Oldest unread: {oldest_unread_date}")
            self.save_stats(total_messages, unread_messages, oldest_unread_date)
            
        except Exception as e:
            print(f"Error getting Skype stats: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            # Hiba esetén nullázzuk az értékeket
            self.save_stats(0, 0, None)

class MessengerService(MessageService):
    async def get_stats(self):
        try:
            print(f"Connecting to Facebook Graph API...")
            graph = GraphAPI(access_token=self.credentials['access_token'])
            
            total_messages = 0
            unread_messages = 0
            oldest_unread_date = None
            
            # Lekérjük az összes beszélgetést
            print("Fetching conversations...")
            conversations = graph.get_object('me/conversations', fields='participants,unread_count,updated_time')
            print(f"Found {len(conversations['data'])} conversations")
            
            for conversation in conversations['data']:
                try:
                    conv_id = conversation['id']
                    print(f"Processing conversation: {conv_id}")
                    
                    # Lekérjük a beszélgetés üzeneteit
                    messages = graph.get_object(f"{conv_id}/messages", fields='created_time,seen')
                    messages_count = len(messages['data'])
                    total_messages += messages_count
                    print(f"Found {messages_count} messages in conversation")
                    
                    # Olvasatlan üzenetek számolása
                    unread_count = conversation.get('unread_count', 0)
                    unread_messages += unread_count
                    
                    # Utolsó olvasatlan üzenet dátuma
                    if unread_count > 0:
                        for message in messages['data']:
                            if not message.get('seen', False):
                                created_time = message.get('created_time')
                                if created_time:
                                    if oldest_unread_date is None or created_time < oldest_unread_date:
                                        oldest_unread_date = created_time
                    
                except Exception as conv_error:
                    print(f"Error processing conversation {conv_id}: {str(conv_error)}")
                    continue
            
            print(f"Final stats - Total messages: {total_messages}, Unread: {unread_messages}, Oldest unread: {oldest_unread_date}")
            self.save_stats(total_messages, unread_messages, oldest_unread_date)
            
        except Exception as e:
            print(f"Error getting Messenger stats: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            # Hiba esetén nullázzuk az értékeket
            self.save_stats(0, 0, None)

class HelpScoutService(MessageService):
    async def get_stats(self):
        try:
            print(f"Connecting to HelpScout API...")
            headers = {
                "Authorization": f"Bearer {self.credentials['api_key']}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                base_url = "https://api.helpscout.net/v2"
                
                # Mailboxok lekérése
                async with session.get(f"{base_url}/mailboxes", headers=headers) as response:
                    if response.status != 200:
                        print(f"Error fetching mailboxes: {await response.text()}")
                        self.save_stats(0, 0, None)
                        return
                        
                    mailboxes_data = await response.json()
                    mailboxes = mailboxes_data.get('_embedded', {}).get('mailboxes', [])
                    
                    total_messages = 0
                    unread_messages = 0
                    oldest_unread_date = None
                    
                    # Minden mailbox feldolgozása
                    for mailbox in mailboxes:
                        mailbox_id = mailbox['id']
                        
                        # Beszélgetések lekérése az adott mailboxból
                        params = {
                            'status': 'all',
                            'embed': 'threads'
                        }
                        
                        async with session.get(
                            f"{base_url}/mailboxes/{mailbox_id}/conversations",
                            headers=headers,
                            params=params
                        ) as conv_response:
                            if conv_response.status == 200:
                                conversations_data = await conv_response.json()
                                conversations = conversations_data.get('_embedded', {}).get('conversations', [])
                                
                                for conv in conversations:
                                    # Üzenetek számolása
                                    thread_count = len(conv.get('_embedded', {}).get('threads', []))
                                    total_messages += thread_count
                                    
                                    # Olvasatlan üzenetek ellenőrzése
                                    if conv.get('status') == 'active' and not conv.get('isRead'):
                                        unread_messages += 1
                                        
                                        # Utolsó olvasatlan üzenet dátumának frissítése
                                        created_at = conv.get('createdAt')
                                        if created_at:
                                            if oldest_unread_date is None or created_at < oldest_unread_date:
                                                oldest_unread_date = created_at
                            else:
                                print(f"Error fetching conversations for mailbox {mailbox_id}: {await conv_response.text()}")
                    
                    print(f"HelpScout stats - Total: {total_messages}, Unread: {unread_messages}, Oldest unread: {oldest_unread_date}")
                    self.save_stats(total_messages, unread_messages, oldest_unread_date)
                    
        except Exception as e:
            print(f"Error getting HelpScout stats: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            # Hiba esetén nullázzuk az értékeket
            self.save_stats(0, 0, None)

def get_service_class(account_type: str):
    service_classes = {
        'WhatsApp': WhatsAppService,
        'Skype': SkypeService,
        'Messenger': MessengerService,
        'HelpScout': HelpScoutService
    }
    return service_classes.get(account_type)

async def update_account_stats():
    try:
        conn = sqlite3.connect('messages.db')
        c = conn.cursor()
        c.execute("SELECT id, account_type, credentials FROM accounts WHERE is_active = TRUE")
        accounts = c.fetchall()
        conn.close()

        services = []
        for account_id, account_type, credentials_str in accounts:
            try:
                print(f"Processing account: {account_id}, type: {account_type}")
                print(f"Raw credentials string: {credentials_str}")
                
                ServiceClass = get_service_class(account_type)
                if ServiceClass:
                    credentials = json.loads(credentials_str)
                    print(f"Parsed credentials: {credentials}")
                    
                    service = ServiceClass(account_id, credentials)
                    services.append(service.get_stats())
                else:
                    print(f"No service class found for account type: {account_type}")
            except Exception as e:
                print(f"Error processing account {account_id}: {str(e)}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
                continue

        if services:
            await asyncio.gather(*services)
        else:
            print("No services to process")
    except Exception as e:
        print(f"Error in update_account_stats: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}") 