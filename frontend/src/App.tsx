import { useState, useEffect, useCallback } from "react"
import { UploadCloud, Search, FileText, Settings, Users, Loader2, RefreshCcw, Briefcase, Download, Trash2 } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Candidate {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  current_job_title: string;
  latest_company: string;
  total_years_of_experience: number;
  skills: string;
}

interface ScanStatus {
  is_scanning: boolean;
  total: number;
  processed: number;
  current_file: string;
}

export default function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  const fetchCandidates = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/candidates")
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch database:", error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await fetchCandidates()
    }
    loadData()
  }, [fetchCandidates])

  // ==========================================
  // NEW: THE ENTERPRISE POLLING ENGINE
  // ==========================================
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isScanning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/v1/scan/status")
          if (res.ok) {
            const data: ScanStatus = await res.json()
            setScanStatus(data)

            // Auto-stop and refresh when job is complete
            if (!data.is_scanning && data.total > 0 && data.processed >= data.total) {
              setIsScanning(false)
              setScanStatus(null)
              fetchCandidates()
              clearInterval(interval)
            }
          }
        } catch (error) {
          console.error("Polling error:", error)
        }
      }, 1000) // Polls every 1 second
    }

    return () => clearInterval(interval)
  }, [isScanning, fetchCandidates])

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Select Folder containing CV PDFs"
      })

      if (selectedPath && typeof selectedPath === 'string') {
        triggerBackendScan(selectedPath)
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error)
    }
  }

  const triggerBackendScan = async (folderPath: string) => {
    setIsScanning(true)
    setScanStatus({ is_scanning: true, total: 0, processed: 0, current_file: "Starting engine..." })
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_path: folderPath }),
      })
      if (!response.ok) throw new Error("Backend pipeline rejected the request.")
    } catch (error) {
      console.error("Critical API Failure:", error)
      alert("Failed to connect to the AURA Processing Engine.")
      setIsScanning(false)
    }
  }

  const handleExportCSV = () => {
    if (candidates.length === 0) return alert("No data to export.")

    const headers = ["Candidate Name", "Email", "Mobile", "Latest Role", "Company", "Experience (Years)", "Top Skills"]
    const csvContent = [
      headers.join(","),
      ...candidates.map(c =>
        `"${c.full_name || ''}","${c.email || ''}","${c.mobile || ''}","${c.current_job_title || ''}","${c.latest_company || ''}","${c.total_years_of_experience || 0}","${c.skills || ''}"`
      )
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "AURA_Candidate_Export.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePurgeDatabase = async () => {
    if (candidates.length === 0) return;
    const confirmed = window.confirm("WARNING: Are you sure you want to permanently purge all candidate records? This action cannot be undone.");
    if (!confirmed) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/candidates", { method: "DELETE" });
      if (response.ok) setCandidates([]);
      else alert("Failed to purge the database. Check backend logs.");
    } catch (error) {
      console.error("Critical API Failure during purge:", error);
    }
  }

  // Calculate Progress Percentage safely
  const progressPercent = scanStatus && scanStatus.total > 0
    ? Math.round((scanStatus.processed / scanStatus.total) * 100)
    : 0;

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">

      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-6 flex flex-col gap-8 shrink-0">
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

      <main className="flex-1 flex flex-col h-full overflow-hidden">

        <header className="h-20 border-b border-zinc-800 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Candidate Database</h2>
            <p className="text-sm text-zinc-400">Total processed profiles: {candidates.length}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64 mr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Search by name..." className="pl-9 bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-zinc-700" />
            </div>

            <Button variant="outline" size="icon" onClick={fetchCandidates} disabled={isScanning} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50">
              <RefreshCcw className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="icon" onClick={handleExportCSV} disabled={isScanning} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50">
              <Download className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="icon" onClick={handlePurgeDatabase} disabled={isScanning} className="border-zinc-800 bg-zinc-900 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 hover:border-red-900/50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button onClick={handleSelectFolder} disabled={isScanning} className="gap-2 bg-zinc-50 text-zinc-950 hover:bg-zinc-200 min-w-[140px] ml-2">
              {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><UploadCloud className="w-4 h-4" /> Scan Directory</>}
            </Button>
          </div>
        </header>

        {/* NEW: LIVE PROGRESS DASHBOARD */}
        {isScanning && scanStatus && (
          <div className="px-8 pt-4 pb-0 shrink-0">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  Processing: <span className="text-zinc-500 font-mono text-xs">{scanStatus.current_file}</span>
                </span>
                <span className="text-zinc-400 font-mono">{scanStatus.processed} / {scanStatus.total} CVs</span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-zinc-200 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-8">
          <div className="border border-zinc-800 rounded-lg bg-zinc-950/50">
            <Table>
              <TableHeader className="bg-zinc-900/50 hover:bg-zinc-900/50">
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 font-medium w-[300px]">Candidate</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Latest Role</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Experience</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Top Skills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-zinc-800">
                    <TableCell colSpan={4} className="h-64 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Briefcase className="w-8 h-8 opacity-20" />
                        <p>No candidates processed yet. Scan a directory to begin.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((candidate) => (
                    <TableRow key={candidate.id} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="font-medium text-zinc-100">
                        {candidate.full_name || "Unknown Candidate"}
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-xs text-zinc-400 font-normal">{candidate.email || "No email"}</span>
                          <span className="text-xs text-zinc-500 font-normal">{candidate.mobile || "No phone number"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-zinc-300">{candidate.current_job_title || "N/A"}</div>
                        <div className="text-xs text-zinc-500 mt-1">{candidate.latest_company}</div>
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {candidate.total_years_of_experience > 0 ? `${candidate.total_years_of_experience} yrs` : "Entry Level"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {(candidate.skills ? candidate.skills.split(",") : []).slice(0, 3).map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-normal text-xs">{skill.trim()}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  )
}