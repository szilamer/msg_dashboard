# Message Dashboard

A real-time message statistics dashboard for multiple messaging platforms.

## Features

- Real-time message statistics monitoring
- Support for multiple messaging platforms (WhatsApp, Skype, Messenger, HelpScout)
- Message trend visualization
- Unread message tracking
- Account-based statistics

## Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

## Installation

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/szilamer/msg_dashboard.git
cd msg_dashboard
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
python main.py
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## Deployment

### Backend Deployment

1. Ensure all requirements are installed
2. Configure environment variables
3. Run the backend server with a production WSGI server like gunicorn:
```bash
gunicorn main:app
```

### Frontend Deployment

1. Build the production version:
```bash
cd frontend
npm run build
```

2. Deploy the contents of the `build` directory to your web server

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=sqlite:///messages.db
API_KEY=your_api_key
```

See `.env.example` for all available options.

## License

MIT 