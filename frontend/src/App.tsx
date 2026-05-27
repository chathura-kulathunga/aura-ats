import { useState } from "react"
import { UploadCloud, Search, FileText, Settings, Users, FolderOpen, Loader2 } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [totalFiles, setTotalFiles] = useState<number>(0)

  // 1. The Native Tauri Folder Picker
  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Select Folder containing CV PDFs"
      })

      if (selectedPath && typeof selectedPath === 'string') {
        setSelectedFolder(selectedPath)
        triggerBackendScan(selectedPath)
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error)
    }
  }

  // 2. The API Bridge to Python FastAPI
  const triggerBackendScan = async (folderPath: string) => {
    setIsScanning(true)
    
    try {
      // Connect to the Python FastAPI backend
      const response = await fetch("http://127.0.0.1:8000/api/v1/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder_path: folderPath }),
      })

      if (!response.ok) throw new Error("Backend pipeline rejected the request.")

      const data = await response.json()
      setTotalFiles(data.total_files)
      
    } catch (error) {
      console.error("Critical API Failure:", error)
      alert("Failed to connect to the AURA Processing Engine. Is the Python backend running?")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-50 rounded-md flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-xl">A</span>
          </div>
          <h1 className="font-bold tracking-widest text-lg">AURA.</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Button variant="secondary" className="justify-start gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50">
            <Users className="w-4 h-4" /> Candidates
          </Button>
          <Button variant="ghost" className="justify-start gap-3 text-zinc-400 hover:text-zinc-50">
            <FileText className="w-4 h-4" /> Reports
          </Button>
          <Button variant="ghost" className="justify-start gap-3 text-zinc-400 hover:text-zinc-50">
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-20 border-b border-zinc-800 px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Candidate Database</h2>
            <p className="text-sm text-zinc-400">Manage and analyze extracted CV profiles.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                placeholder="Search by name, skill, or role..." 
                className="pl-9 bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-zinc-700"
              />
            </div>
            
            {/* DYNAMIC SCAN BUTTON */}
            <Button 
              onClick={handleSelectFolder} 
              disabled={isScanning}
              className="gap-2 bg-zinc-50 text-zinc-950 hover:bg-zinc-200 min-w-[140px]"
            >
              {isScanning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Initializing...</>
              ) : (
                <><UploadCloud className="w-4 h-4" /> Scan Directory</>
              )}
            </Button>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="p-8 flex-1 overflow-auto">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Extraction Engine</CardTitle>
              <CardDescription className="text-zinc-400">
                {selectedFolder ? `Target Directory: ${selectedFolder}` : "Awaiting a directory selection to begin the OCR and AI extraction pipeline."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalFiles > 0 ? (
                <div className="h-64 border-2 border-zinc-800 rounded-lg flex flex-col items-center justify-center bg-zinc-900 gap-2">
                  <h3 className="text-3xl font-bold text-zinc-50">{totalFiles}</h3>
                  <p className="text-zinc-400">PDF Resumes queued for AI processing.</p>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-500 gap-4">
                  <FolderOpen className="w-10 h-10 text-zinc-600" />
                  <p>Click "Scan Directory" in the top right to select a local folder.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  )
}