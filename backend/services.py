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
import base64
import logging
import traceback

class MessageService(ABC):
    def __init__(self, account_id: int, credentials: dict):
        self.account_id = account_id
        self.credentials = credentials
        self.db_path = os.path.join(os.path.dirname(__file__), 'messages.db')

    @abstractmethod
    async def get_stats(self):
        pass

    def save_stats(self, total_messages: int, unread_messages: int, oldest_unread_date: str):
        conn = sqlite3.connect(self.db_path)
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
            print(f"Full traceback: {traceback.format_exc()}")
            # Hiba esetén nullázzuk az értékeket
            self.save_stats(0, 0, None)

class SkypeService(MessageService):
    async def get_stats(self):
        try:
            print(f"Attempting to connect to Skype with username: {self.credentials['username']}")
            sk = Skype(self.credentials['username'], self.credentials['password'])
            print("Successfully connected to Skype")
            
            total_messages = 0
            unread_messages = 0
            oldest_unread_date = None
            
            print("Fetching recent chats...")
            chats = sk.chats.recent()
            print(f"Found {len(chats)} chats, processing...")
            
            for chat_id, chat in chats.items():
                try:
                    print(f"Processing chat: {chat_id}")
                    if hasattr(chat, 'getMsgs'):
                        messages = list(chat.getMsgs())
                        print(f"Found {len(messages)} messages in chat")
                        total_messages += len(messages)
                        
                        for msg in messages:
                            try:
                                # Debug információk
                                print(f"Message ID: {msg.id}")
                                print(f"Message type: {msg.type}")
                                print(f"Message time: {msg.time}")
                                
                                # Ellenőrizzük az üzenet állapotát
                                is_unread = False
                                
                                # Új módszer: közvetlenül a msg objektumból ellenőrizzük
                                if hasattr(msg, 'read'):
                                    is_unread = not bool(msg.read)
                                    print(f"Message read status from read attribute: {is_unread}")
                                
                                # Ha nincs read attribútum, próbáljuk a properties-ből
                                if not hasattr(msg, 'read') and hasattr(msg, 'properties'):
                                    is_unread = bool(msg.properties.get('isunread', False))
                                    print(f"Message read status from properties: {is_unread}")
                                
                                if is_unread:
                                    unread_messages += 1
                                    if hasattr(msg, 'time'):
                                        msg_date = msg.time.isoformat() if msg.time else None
                                        if msg_date:
                                            if oldest_unread_date is None or msg_date < oldest_unread_date:
                                                oldest_unread_date = msg_date
                                                print(f"Found unread message from: {msg_date}")
                            except Exception as msg_error:
                                print(f"Error processing message in chat {chat_id}: {str(msg_error)}")
                                continue
                                
                except Exception as chat_error:
                    print(f"Error processing chat {chat_id}: {str(chat_error)}")
                    continue
            
            print(f"Final Skype stats - Total messages: {total_messages}, Unread: {unread_messages}, Oldest unread: {oldest_unread_date}")
            self.save_stats(total_messages, unread_messages, oldest_unread_date)
            
        except Exception as e:
            print(f"Error getting Skype stats: {str(e)}")
            print(f"Error type: {type(e)}")
            print(f"Full traceback: {traceback.format_exc()}")
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
            print(f"Full traceback: {traceback.format_exc()}")
            # Hiba esetén nullázzuk az értékeket
            self.save_stats(0, 0, None)

class HelpScoutService(MessageService):
    def __init__(self, account_id: int, credentials: dict):
        super().__init__(account_id, credentials)
        self.client_id = credentials.get('client_id')
        self.client_secret = credentials.get('client_secret')
        self.logger = logging.getLogger('helpscout')
        self.logger.setLevel(logging.DEBUG)
    
    async def get_stats(self):
        try:
            self.logger.info("Starting HelpScout stats collection...")
            
            if not self.client_id or not self.client_secret:
                self.logger.error("Missing client_id or client_secret!")
                raise Exception("HelpScout bejelentkezési adatok hiányoznak")
            
            # OAuth token beszerzése
            token_url = 'https://api.helpscout.net/v2/oauth2/token'
            
            auth_str = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
            token_headers = {
                'Authorization': f'Basic {auth_str}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            token_data = {
                'grant_type': 'client_credentials'
            }
            
            # Szinkron kérés a token beszerzéséhez
            token_response = requests.post(token_url, headers=token_headers, data=token_data)
            self.logger.debug(f"Token response status: {token_response.status_code}")
            
            if token_response.status_code != 200:
                self.logger.error(f"Failed to get token: {token_response.status_code}")
                raise Exception("Nem sikerült a token beszerzése")
            
            access_token = token_response.json().get('access_token')
            
            if not access_token:
                self.logger.error("No access token in response")
                raise Exception("Hiányzó access token")
            
            # API hívások fejléce
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Aktív beszélgetések lekérése szinkron módon
            self.logger.info("Fetching active conversations...")
            active_conversations = requests.get(
                'https://api.helpscout.net/v2/conversations',
                headers=headers,
                params={
                    'status': 'active',
                    'embed': 'threads',
                    'pageSize': 50
                }
            )
            
            if active_conversations.status_code != 200:
                self.logger.error(f"Failed to get conversations: {active_conversations.status_code}")
                raise Exception("Nem sikerült a beszélgetések lekérése")
            
            active_data = active_conversations.json()
            total_active = active_data.get('page', {}).get('totalElements', 0)
            conversations = active_data.get('_embedded', {}).get('conversations', [])
            
            self.logger.info(f"Found {total_active} active conversations")
            
            total_messages = 0
            unread_count = 0
            oldest_unread = None
            
            # Beszélgetések feldolgozása
            for conv in conversations:
                conv_id = conv.get('id')
                threads = conv.get('_embedded', {}).get('threads', [])
                total_messages += len(threads)
                is_unread = False
                
                # Thread-ek ellenőrzése
                for thread in threads:
                    if not thread.get('seenByAgent', False):
                        is_unread = True
                        if oldest_unread is None or thread.get('createdAt', '') < oldest_unread.get('createdAt', ''):
                            oldest_unread = thread
                
                if is_unread:
                    unread_count += 1
                
                self.logger.debug(f"Conversation {conv_id}:")
                self.logger.debug(f"Status: {conv.get('status')}")
                self.logger.debug(f"Unread: {'Yes' if is_unread else 'No'}")
                self.logger.debug(f"Created at: {conv.get('createdAt')}")
                self.logger.debug(f"Modified at: {conv.get('modifiedAt')}")
                self.logger.debug(f"Thread count: {len(threads)}")
            
            self.logger.info(f"Total messages: {total_messages}")
            self.logger.info(f"Unread messages: {unread_count}")
            
            oldest_unread_date = oldest_unread.get('createdAt') if oldest_unread else None
            self.logger.info(f"Oldest unread date: {oldest_unread_date}")
            
            # Mentjük a statisztikákat
            self.save_stats(total_messages, unread_count, oldest_unread_date)
            
        except Exception as e:
            self.logger.error(f"Error in HelpScout get_stats: {str(e)}")
            self.logger.error(f"Error type: {type(e)}")
            print(f"Full traceback: {traceback.format_exc()}")
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
        db_path = os.path.join(os.path.dirname(__file__), 'messages.db')
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT id, account_type, credentials FROM accounts WHERE is_active = TRUE")
        accounts = c.fetchall()
        conn.close()

        services = []
        for account_id, account_type, credentials_str in accounts:
            try:
                logging.info(f"Processing account: {account_id}, type: {account_type}")
                logging.debug(f"Raw credentials string: {credentials_str}")
                
                ServiceClass = get_service_class(account_type)
                if ServiceClass:
                    credentials = json.loads(credentials_str)
                    logging.debug(f"Parsed credentials: {credentials}")
                    
                    service = ServiceClass(account_id, credentials)
                    services.append(service.get_stats())
                else:
                    logging.error(f"No service class found for account type: {account_type}")
            except Exception as e:
                logging.error(f"Error processing account {account_id}: {str(e)}")
                logging.error(f"Traceback: {traceback.format_exc()}")
                continue

        if services:
            await asyncio.gather(*services)
        else:
            logging.warning("No services to process")
    except Exception as e:
        logging.error(f"Error in update_account_stats: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}") 