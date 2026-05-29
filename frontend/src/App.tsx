import { useState, useEffect, useCallback, useMemo } from "react"
import { UploadCloud, Search, Settings, Users, Loader2, RefreshCcw, Briefcase, Download, Trash2, BarChart3, Database, Key, ShieldCheck, TrendingUp, Award, Filter } from "lucide-react"
import { open, save } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"
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

type TabState = 'candidates' | 'reports' | 'settings';
type SortOrder = 'newest' | 'exp-high' | 'exp-low' | 'name-a-z';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabState>('candidates')
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isScanning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/v1/scan/status")
          if (res.ok) {
            const data: ScanStatus = await res.json()
            setScanStatus(data)

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
      }, 1000)
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

  // ==========================================
  //        SEARCH & SORTING ENGINE
  // ==========================================
  const processedCandidates = useMemo(() => {
    let result = [...candidates];

    // Apply Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.full_name && c.full_name.toLowerCase().includes(query)) ||
        (c.current_job_title && c.current_job_title.toLowerCase().includes(query)) ||
        (c.skills && c.skills.toLowerCase().includes(query))
      );
    }

    // Apply Sorting Logic
    if (sortOrder === 'exp-high') {
      result.sort((a, b) => (b.total_years_of_experience || 0) - (a.total_years_of_experience || 0));
    } else if (sortOrder === 'exp-low') {
      result.sort((a, b) => (a.total_years_of_experience || 0) - (b.total_years_of_experience || 0));
    } else if (sortOrder === 'name-a-z') {
      result.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    }

    return result;
  }, [candidates, searchQuery, sortOrder]);

  // ==========================================
  //          NATIVE OS CSV EXPORT
  // ==========================================
  const handleExportCSV = async () => {
    if (processedCandidates.length === 0) return alert("No data to export.")

    try {
      const headers = ["Candidate Name", "Email", "Mobile", "Latest Role", "Company", "Experience (Years)", "Top Skills"]
      const csvContent = [
        headers.join(","),
        ...processedCandidates.map(c =>
          `"${c.full_name || ''}","${c.email || ''}","${c.mobile || ''}","${c.current_job_title || ''}","${c.latest_company || ''}","${c.total_years_of_experience || 0}","${c.skills || ''}"`
        )
      ].join("\n")

      const defaultName = activeTab === 'reports' ? "AURA_Analytics_Report.csv" : "AURA_Candidates.csv";

      // Trigger the native Windows/Mac "Save As" window
      const savePath = await save({
        title: 'Export AURA Data',
        defaultPath: defaultName,
        filters: [{
          name: 'CSV Document',
          extensions: ['csv']
        }]
      });

      // Writes the file if the user hits "Save"
      if (savePath) {
        await writeTextFile(savePath, csvContent);
      }
    } catch (error) {
      console.error("Failed to export file:", error);
      alert(`System Error: ${error}`);
    }
  }

  // ==========================================
  //      REAL-TIME ANALYTICS CALCULATOR
  // ==========================================
  const analytics = useMemo(() => {
    if (candidates.length === 0) return { avgExp: 0, topSkills: [] };

    // Calculate Average Experience
    const totalExp = candidates.reduce((sum, c) => sum + (c.total_years_of_experience || 0), 0);
    const avgExp = (totalExp / candidates.length).toFixed(1);

    // Calculate Top Skills
    const skillCounts: Record<string, number> = {};
    candidates.forEach(c => {
      if (c.skills) {
        c.skills.split(',').forEach(s => {
          const skill = s.trim().toUpperCase();
          if (skill) skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }
    });

    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency (highest first)
      .slice(0, 5); // Take top 5

    return { avgExp, topSkills };
  }, [candidates]);

  const progressPercent = scanStatus && scanStatus.total > 0
    ? Math.round((scanStatus.processed / scanStatus.total) * 100)
    : 0;

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-6 flex flex-col gap-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-50 rounded-md flex items-center justify-center shadow-lg">
            <span className="text-zinc-950 font-bold text-xl">A</span>
          </div>
          <h1 className="font-bold tracking-widest text-lg">AURA.</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('candidates')}
            className={`justify-start gap-3 ${activeTab === 'candidates' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-50'}`}
          >
            <Users className="w-4 h-4" /> Candidates
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('reports')}
            className={`justify-start gap-3 ${activeTab === 'reports' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-50'}`}
          >
            <BarChart3 className="w-4 h-4" /> Reports
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            className={`justify-start gap-3 ${activeTab === 'settings' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-50'}`}
          >
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* DYNAMIC HEADER */}
        <header className="h-20 border-b border-zinc-800 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
          <div>
            <h2 className="text-xl font-semibold tracking-tight capitalize">{activeTab} Database</h2>
            <p className="text-sm text-zinc-400">
              {activeTab === 'candidates' ? `Total processed profiles: ${processedCandidates.length}` :
                activeTab === 'reports' ? 'System Analytics & Data Export' : 'System Administration'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'candidates' && (
              <div className="relative w-64 mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search by name, role, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-zinc-700 transition-all"
                />
              </div>
            )}

            <Button variant="outline" size="icon" onClick={fetchCandidates} disabled={isScanning} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50">
              <RefreshCcw className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="icon" onClick={handleExportCSV} disabled={isScanning || processedCandidates.length === 0} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50" title="Export Current Data">
              <Download className="w-4 h-4" />
            </Button>

            {activeTab === 'candidates' && (
              <Button variant="outline" size="icon" onClick={handlePurgeDatabase} disabled={isScanning || candidates.length === 0} className="border-zinc-800 bg-zinc-900 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 hover:border-red-900/50 transition-colors" title="Purge Database">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <Button onClick={handleSelectFolder} disabled={isScanning} className="gap-2 bg-zinc-50 text-zinc-950 hover:bg-zinc-200 min-w-[140px] ml-2">
              {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><UploadCloud className="w-4 h-4" /> Scan Directory</>}
            </Button>
          </div>
        </header>

        {/* PROGRESS BAR */}
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

        {/* TAB ROUTING CONTENT */}
        <div className="flex-1 overflow-auto p-8">

          {/* VIEW: CANDIDATES */}
          {activeTab === 'candidates' && (
            <div className="flex flex-col gap-4">

              {/* Filtering & Sorting Controls */}
              <div className="flex justify-end gap-2">
                <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-1.5">
                  <Filter className="w-4 h-4 text-zinc-500" />
                  <select
                    className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  >
                    <option value="newest" className="bg-zinc-900">Sort: Newest First</option>
                    <option value="exp-high" className="bg-zinc-900">Sort: Experience (High to Low)</option>
                    <option value="exp-low" className="bg-zinc-900">Sort: Experience (Low to High)</option>
                    <option value="name-a-z" className="bg-zinc-900">Sort: Name (A-Z)</option>
                  </select>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-lg bg-zinc-950/50 overflow-hidden">
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
                    {processedCandidates.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-zinc-800">
                        <TableCell colSpan={4} className="h-64 text-center text-zinc-500">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Briefcase className="w-8 h-8 opacity-20" />
                            <p>{searchQuery ? "No candidates match your search." : "No candidates processed yet. Scan a directory to begin."}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      processedCandidates.map((candidate) => (
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
          )}

          {/* VIEW: REPORTS (Analytics Dashboard) */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-6">

              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-950/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-zinc-400 text-sm font-medium">Total Candidates</h4>
                    <Users className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-4xl font-bold text-zinc-100">{candidates.length}</p>
                </div>

                <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-950/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-zinc-400 text-sm font-medium">Avg. Experience</h4>
                    <TrendingUp className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-4xl font-bold text-zinc-100">{analytics.avgExp} <span className="text-lg text-zinc-500 font-normal">years</span></p>
                </div>

                <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-950/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-zinc-400 text-sm font-medium">Most Demand Skill</h4>
                    <Award className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-2xl font-bold text-zinc-100 truncate">
                    {analytics.topSkills.length > 0 ? analytics.topSkills[0][0] : "N/A"}
                  </p>
                </div>

              </div>

              {/* Skills Breakdown */}
              <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-950/50">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-zinc-400" />
                  Top Skill Frequencies
                </h3>
                <div className="flex flex-col gap-3">
                  {analytics.topSkills.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No skill data available.</p>
                  ) : (
                    analytics.topSkills.map(([skill, count], index) => {
                      const percentage = Math.round((count / candidates.length) * 100);
                      return (
                        <div key={index} className="flex items-center gap-4">
                          <span className="w-32 text-sm text-zinc-300 truncate">{skill}</span>
                          <div className="flex-1 bg-zinc-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-zinc-200 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs text-zinc-500 font-mono">{count}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Export Call to Action */}
              <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/30 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-zinc-100">Download Analytical Report</h3>
                  <p className="text-sm text-zinc-500">Export the currently sorted dataset to a CSV file for Excel processing.</p>
                </div>
                <Button onClick={handleExportCSV} className="gap-2 bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
                  <Download className="w-4 h-4" /> Export CSV Report
                </Button>
              </div>

            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl flex flex-col gap-6">
              <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-950/50">
                <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
                  <Database className="w-5 h-5 text-zinc-400" />
                  <h3 className="text-lg font-medium">Database Configuration</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">AURA is currently connected to a local SQLite database running in WAL-mode for high concurrency background processing.</p>
                <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 cursor-not-allowed opacity-50">Local Database Secured</Button>
              </div>

              <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-950/50">
                <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
                  <ShieldCheck className="w-5 h-5 text-zinc-400" />
                  <h3 className="text-lg font-medium">AI Extraction Engine</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">Model Protocol: <span className="text-zinc-100 font-mono bg-zinc-900 px-2 py-1 rounded">deepseek-chat</span></p>
                <div className="inline-flex items-center gap-2 text-sm text-green-400 bg-green-950/30 border border-green-900/50 px-3 py-2 rounded">
                  <Key className="w-4 h-4" /> API Gateway Verified
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}