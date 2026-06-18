# HerSummerHack

A hackathon project with a Django REST API backend and React + Vite frontend.

## Project Structure

```
HerSummerHack/
├── backend/        # Django REST API
│   ├── api/        # Main app (views, models, urls)
│   ├── backend/    # Project settings & root urls
│   └── manage.py
└── frontend/       # React + Vite
    ├── src/
    └── index.html
```

## Getting Started

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edit DJANGO_SECRET_KEY

python manage.py migrate
python manage.py runserver      # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the Django backend automatically — no CORS config needed during development.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Health check |

## Tech Stack

- **Backend**: Python 3.11, Django 5, Django REST Framework, django-cors-headers
- **Frontend**: React 18, Vite, JavaScript
- **Database**: SQLite (dev)
