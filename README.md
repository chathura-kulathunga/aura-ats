## 🧠 System Architecture & Core Features

CVPilot is engineered to bridge the gap between heavy, cloud-dependent Applicant Tracking Systems and lightweight, privacy-focused desktop applications. By combining a native Rust-based desktop environment with a localized Python processing pipeline, CVPilot ensures candidate data remains entirely on your machine while leveraging advanced AI for heavy lifting.

### ⚡ The AI Extraction Engine
Manual data entry is obsolete. CVPilot integrates the **DeepSeek API (`deepseek-chat`)** to perform deep Natural Language Processing (NLP) on raw, unstructured PDF resumes. The engine intelligently reads documents, identifies context, and extracts critical data points (names, contact info, job titles, companies, years of experience, and technical skills) into a strictly typed schema.

### 🗄️ High-Concurrency Local Database
To ensure lightning-fast UI responsiveness and offline data persistence, the backend utilizes a local **SQLite database operating in WAL (Write-Ahead Logging) mode**. This allows the FastAPI pipeline to concurrently write heavy AI-processed data in the background without locking the database or freezing the frontend dashboard.

### 📊 Real-Time Talent Analytics
The system doesn't just store data; it analyzes it. The frontend features a dynamic, real-time analytics calculator that immediately evaluates the scanned talent pool. 
* **Experience Aggregation:** Automatically calculates the average years of experience across all processed candidates.
* **Skill Frequency Mapping:** Dynamically parses all technical skills across the database to identify and rank the top 5 most highly demanded skills in your talent pool.

### 🖥️ Native OS Integration (Tauri)
Unlike traditional web apps wrapped in Electron, CVPilot is built on **Tauri**, resulting in a vastly smaller memory footprint and true native OS capabilities. Using `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`, the application bypasses browser sandboxes to trigger native Windows/macOS file dialogs, allowing users to safely and directly export targeted CSV analytical reports to their hard drives.

### 🛠️ The Tech Stack
* **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
* **Desktop Core:** Rust, Tauri v2
* **Backend Pipeline:** Python 3, FastAPI, Uvicorn
* **Database:** SQLite3 (WAL-Mode)
* **AI Protocol:** DeepSeek NLP API


## ⚙️ Quick Start Installation
To run CVPilot locally, clone the repository and open **3 separate terminal windows** (Git Bash recommended).

### 🔑 1. Configure the AI Engine (Better use VS CODE)
Navigate to the `backend` folder, duplicate `.env.example`, rename it to `.env`, and add your DeepSeek API key:
```text
DEEPSEEK_API_KEY="your_actual_api_key_here"
```

### 🖥️ 2. Terminal 1: Boot the Backend API
Open your first terminal, navigate to the backend, activate the virtual environment, and start the FastAPI server:
```bash
cd backend
source venv/Scripts/activate
python -m uvicorn app.main:app --reload --port 8000
```

### 🌐 3. Terminal 2: Boot the Frontend Server
Open your second terminal, navigate to the frontend, install dependencies, and start the React/Vite server:
```bash
cd frontend
npm install
npm run dev
```

### ⚡ 4. Terminal 3: Launch the Desktop App
Open your third terminal, navigate to the frontend, and boot the native Tauri application window:
```bash
cd frontend
npx tauri dev
```

> ⚠️ **Note:** Do not close any of these terminals while using the application. The backend engine, frontend server, and Tauri window must all run concurrently.