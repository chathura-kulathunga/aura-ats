import { useState, useEffect, useCallback } from "react"
import { UploadCloud, Search, FileText, Settings, Users, Loader2, RefreshCcw, Briefcase, Download } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Added 'mobile' to the interface
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

export default function App() {
  const [isScanning, setIsScanning] = useState(false)
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
    } finally {
      setIsScanning(false)
    }
  }

  // The new Export to Excel/CSV function
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

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
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

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
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
            
            <Button variant="outline" size="icon" onClick={fetchCandidates} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50" title="Refresh Data">
              <RefreshCcw className="w-4 h-4" />
            </Button>

            {/* NEW EXPORT BUTTON */}
            <Button variant="outline" size="icon" onClick={handleExportCSV} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50" title="Export to Excel">
              <Download className="w-4 h-4" />
            </Button>

            <Button onClick={handleSelectFolder} disabled={isScanning} className="gap-2 bg-zinc-50 text-zinc-950 hover:bg-zinc-200 min-w-[140px] ml-2">
              {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Queuing...</> : <><UploadCloud className="w-4 h-4" /> Scan Directory</>}
            </Button>
          </div>
        </header>

        {/* DATA TABLE */}
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
                      {/* UPDATED CELL: Now shows Mobile Number */}
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