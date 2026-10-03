# MoveSmart (React + Node + MySQL)

## One-time setup
1. Database: open MySQL Workbench, open database/schema.sql, press Ctrl+A, then Execute.
2. Backend settings: in the backend folder, copy .env.example to a new file named .env
   and put your MySQL password in DB_PASSWORD (JWT_SECRET can be any long random text).
3. Install libraries:
     cd backend
     npm install
     cd ../frontend
     npm install

## Run (3 terminals, keep all open)
Terminal 1:  cd backend   then   npm run dev
Terminal 2:  cd backend   then   npm run simulate     (this makes the buses move)
Terminal 3:  cd frontend  then   npm run dev

Open http://localhost:5173
Password reset links are printed in Terminal 1 (no email service yet).
