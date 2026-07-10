from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .models import User
from .schemas import Token, UserResponse, UserCreate
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .routers import zones, records

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Route53 Clone API")

def generate_aws_account_id(db: Session) -> str:
    import random
    import string
    while True:
        account_id = "".join(random.choices(string.digits, k=12))
        existing = db.query(User).filter(User.aws_account_id == account_id).first()
        if not existing:
            return account_id

# Seed default admin user on startup if not exists (or migrate from bcrypt to sha256)
db = next(get_db())
try:
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        hashed_pwd = get_password_hash("adminpassword")
        new_admin = User(username="admin", password_hash=hashed_pwd, aws_account_id="123456789012")
        db.add(new_admin)
        db.commit()
    else:
        modified = False
        if len(admin_user.password_hash) != 64:
            admin_user.password_hash = get_password_hash("adminpassword")
            modified = True
        if not admin_user.aws_account_id:
            admin_user.aws_account_id = "123456789012"
            modified = True
        if modified:
            db.commit()
finally:
    db.close()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    username = user_in.username.strip()
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty"
        )
    
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken"
        )
    
    hashed_pwd = get_password_hash(user_in.password)
    aws_id = generate_aws_account_id(db)
    new_user = User(username=username, password_hash=hashed_pwd, aws_account_id=aws_id)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


app.include_router(zones.router)
app.include_router(records.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Route53 Clone API"}
