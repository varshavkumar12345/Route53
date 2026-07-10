# AWS Route53 Clone

A pixel-perfect, highly responsive clone of the Amazon Route 53 console.

## Architecture

This project is structured as a multi-project repository:
- **`backend/`**: FastAPI, SQLite, and SQLAlchemy providing DNS domain registration, Hosted Zone CRUD, and DNS Record CRUD, backed by JWT and bcrypt user authentication.
- **`frontend/`**: Next.js App Router (TypeScript, React, Vanilla CSS modules) recreating the AWS Cloudscape Design System.

## Project Structure

```
Route53/
├── backend/
│   ├── app/
│   │   ├── database.py       # SQLite connection and session management
│   │   ├── models.py         # SQLAlchemy models for Zones, Records, and Users
│   │   ├── schemas.py        # Pydantic schemas for requests/responses
│   │   ├── auth.py           # Authentication backend (JWT, bcrypt)
│   │   ├── main.py           # FastAPI entrypoint and middleware
│   │   └── routers/
│   │       ├── zones.py      # CRUD for Hosted Zones
│   │       └── records.py    # CRUD for DNS Records
│   ├── requirements.txt
│   └── route53.db            # SQLite database file
└── frontend/
    ├── src/
    │   ├── app/              # Next.js App Router (layout, page, login, dashboard)
    │   ├── components/       # AWS console components (Sidebar, TopNav, Tables, Forms)
    │   └── styles/           # Global styles and CSS Modules
    ├── package.json
    └── tsconfig.json
```

## Running the Application

### 1. Backend Setup

From the `backend/` directory:
1. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Activate the virtual environment:
   - On Windows (PowerShell):
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - On Unix/macOS:
     ```bash
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

*Note: On startup, the database is automatically created and seeded with a default user:*
- **Username**: `admin`
- **Password**: `adminpassword`

### 2. Frontend Setup

From the `frontend/` directory:
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

Access the console in your browser at [http://localhost:3000](http://localhost:3000). Log in with the default admin credentials to view the dashboard!


Run Backend
```
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Run Frontend
```
cd frontend
npm run dev
```