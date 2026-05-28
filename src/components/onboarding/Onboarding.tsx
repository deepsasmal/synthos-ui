import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { Button } from "../ui/Button";
import { 
  Sun, 
  Moon, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  FolderOpen, 
  Plus, 
  LogOut, 
  FolderDot 
} from "lucide-react";
import { synthosApi, Project, User } from "../../lib/synthosApi";

interface OnboardingProps {
  userId: string | null;
  onComplete: (projectId: string, userId: string, projectName: string, userName: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export function Onboarding({ userId, onComplete, theme, toggleTheme }: OnboardingProps) {
  // Auth tab selection when no userId (register vs login)
  const [authTab, setAuthTab] = useState<"register" | "login">("register");
  const [loginUserId, setLoginUserId] = useState("");

  // New User Registration states
  const [projectName, setProjectName] = useState("");
  const [userName, setUserName] = useState("");

  // Dashboard & State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Project Creation inside Dashboard
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  // Fetch projects and profile if returning user
  useEffect(() => {
    if (!userId) return;

    async function loadDashboardData() {
      setIsLoadingProjects(true);
      setError(null);
      try {
        const [profile, projectList] = await Promise.all([
          synthosApi.getUser(userId!),
          synthosApi.listProjects(userId!)
        ]);
        setUserProfile(profile);
        setProjects(projectList);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Could not load your projects. Please verify the SQLite backend REST server is active.");
      } finally {
        setIsLoadingProjects(false);
      }
    }

    loadDashboardData();
  }, [userId]);

  // Handle registration submission (New User + First Project)
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !userName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create user profile
      const user = await synthosApi.registerUser(userName.trim());
      
      // 2. Create first project
      const project = await synthosApi.createProject(user.user_id, projectName.trim());

      // 3. Cache session identifiers
      localStorage.setItem("synthos_user_id", user.user_id);
      localStorage.setItem("synthos_project_id", project.project_id);

      onComplete(project.project_id, user.user_id, project.project_name, user.name);
    } catch (err: any) {
      console.error(err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Failed to initialize workspace. Please ensure the SQLite REST server is running on port 7777."
      );
      setIsSubmitting(false);
    }
  };

  // Handle login with existing user_id
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = loginUserId.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await synthosApi.getUser(trimmed);
      localStorage.setItem("synthos_user_id", user.user_id);
      // Don't set a project yet — let the dashboard handle that
      // Reload so App re-validates the session and lands on the dashboard
      window.location.reload();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "User ID not found. Check the ID and try again.");
      setIsSubmitting(false);
    }
  };

  // Handle creating a new project inside the Dashboard
  const handleCreateNewProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !userId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const project = await synthosApi.createProject(
        userId, 
        newProjectName.trim(), 
        newProjectDesc.trim() || "Collaborative ER Schema"
      );

      localStorage.setItem("synthos_project_id", project.project_id);
      onComplete(project.project_id, userId, project.project_name, userProfile?.name || "User");
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create new project.");
      setIsSubmitting(false);
    }
  };

  // Handle selecting/resuming an existing project
  const handleSelectProject = (project: Project) => {
    if (!userId || !userProfile) return;
    localStorage.setItem("synthos_project_id", project.project_id);
    onComplete(project.project_id, userId, project.project_name, userProfile.name);
  };

  // Handle deleting a project
  const handleDeleteProject = async (projectIdToDelete: string, e: MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open card click
    if (!confirm("Are you sure you want to permanently delete this project? This action cannot be undone.")) return;

    setError(null);
    try {
      await synthosApi.deleteProject(projectIdToDelete);
      setProjects(prev => prev.filter(p => p.project_id !== projectIdToDelete));
      
      // If we deleted the active project in localStorage, clear it
      if (localStorage.getItem("synthos_project_id") === projectIdToDelete) {
        localStorage.removeItem("synthos_project_id");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to delete project. Please try again.");
    }
  };

  // Handle logging out / switching user
  const handleSwitchAccount = () => {
    localStorage.removeItem("synthos_user_id");
    localStorage.removeItem("synthos_project_id");
    window.location.reload(); // Force full reload to reset orchestration
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // --- RENDER 1: Returning User Dashboard View ---
  if (userId) {
    return (
      <div className="min-h-screen flex flex-col bg-base text-[color:var(--text-color)] font-sans transition-colors relative p-6 md:p-12 overflow-y-auto">
        {/* Header Actions */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full hover:bg-surface-hover text-muted hover:text-[color:var(--text-color)] transition-colors"
            title="Toggle Theme"
            disabled={isSubmitting}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <button
            onClick={handleSwitchAccount}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono rounded-lg transition-colors border border-red-500/25"
            title="Switch Account / Sign Out"
            disabled={isSubmitting}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Switch Account</span>
          </button>
        </div>

        <div className="max-w-6xl w-full mx-auto mt-8 flex-1 flex flex-col">
          {/* Welcome Intro */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 bg-accent rounded-sm flex items-center justify-center">
              <span className="text-accent-fg font-display font-bold text-xl">S</span>
            </div>
            <span className="font-display font-bold text-3xl tracking-tight">Synthos</span>
          </div>

          <div className="mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Welcome back, <span className="text-accent">{userProfile?.name || "User"}</span>!
            </h1>
            <p className="text-muted text-sm mt-1">Select an existing database project to co-design or create a new one.</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Dashboard Error:</span> {error}
              </div>
            </div>
          )}

          {/* Loading projects skeleton */}
          {isLoadingProjects ? (
            <div className="flex flex-col items-center justify-center py-20 flex-1">
              <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
              <p className="text-sm font-mono text-muted animate-pulse">Fetching your collaborative projects...</p>
            </div>
          ) : isCreatingNew ? (
            /* Create New Project Form within Dashboard */
            <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-2xl mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 mb-6 text-accent">
                <FolderDot className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-[color:var(--text-color)]">Create New Project</h2>
              </div>

              <form onSubmit={handleCreateNewProject} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="newProjectName" className="text-xs font-mono text-muted uppercase tracking-wider">Project Name</label>
                  <input
                    id="newProjectName"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Analytics Platform"
                    disabled={isSubmitting}
                    className="w-full bg-base border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-[color:var(--text-color)] placeholder:text-muted/50 disabled:opacity-50"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="newProjectDesc" className="text-xs font-mono text-muted uppercase tracking-wider">Description</label>
                  <textarea
                    id="newProjectDesc"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Describe the schema (optional)..."
                    disabled={isSubmitting}
                    className="w-full h-24 bg-base border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-[color:var(--text-color)] placeholder:text-muted/50 resize-none disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNewProjectName("");
                      setNewProjectDesc("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={!newProjectName.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* Dashboard Cards Grid */
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* "+ Create New Project" Trigger Card */}
                <div 
                  onClick={() => setIsCreatingNew(true)}
                  className="bg-transparent border-2 border-dashed border-border/80 hover:border-accent/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[180px] hover:bg-accent/5 transition-all duration-300 group hover:scale-[1.02] shadow-sm hover:shadow-lg"
                >
                  <div className="h-12 w-12 rounded-full bg-surface border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-accent group-hover:text-accent-fg transition-all">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-sm text-[color:var(--text-color)] group-hover:text-accent transition-colors">Create New Project</span>
                  <span className="text-xs text-muted mt-1 max-w-[200px]">Define a brand new collaborative ER schema workspace</span>
                </div>

                {/* Listing of Existing Projects */}
                {projects.map((project) => (
                  <div
                    key={project.project_id}
                    onClick={() => handleSelectProject(project)}
                    className="bg-surface border border-border hover:border-accent/40 rounded-2xl p-6 flex flex-col justify-between cursor-pointer min-h-[180px] transition-all duration-300 hover:scale-[1.02] group hover:shadow-2xl relative overflow-hidden"
                  >
                    {/* Top glass glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-accent/0 via-accent/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="z-10 flex-1">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h3 className="font-display font-semibold text-base group-hover:text-accent transition-colors truncate">{project.project_name}</h3>
                        <button
                          onClick={(e) => handleDeleteProject(project.project_id, e)}
                          className="text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors shrink-0"
                          title="Delete Project Permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted line-clamp-3 mb-4 leading-relaxed">
                        {project.project_desc || "Collaborative ER Schema designer."}
                      </p>
                    </div>

                    <div className="z-10 pt-4 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>Updated {formatDate(project.updated_at)}</span>
                      <span className="flex items-center gap-1 text-accent font-semibold opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        Resume <FolderOpen className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-surface/30 mt-6">
                  <FolderDot className="h-10 w-10 text-muted mb-3" />
                  <p className="text-sm font-semibold text-muted">No projects found</p>
                  <p className="text-xs text-muted/60 mt-1">Get started by clicking the "Create New Project" card above!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER 2: Auth Screen (Register or Sign In) ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base text-[color:var(--text-color)] font-sans transition-colors relative p-4">
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-surface-hover text-muted hover:text-[color:var(--text-color)] transition-colors"
          title="Toggle Theme"
          disabled={isSubmitting}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 bg-accent rounded-sm flex items-center justify-center">
            <span className="text-accent-fg font-display font-bold text-lg">S</span>
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">Synthos</span>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-base rounded-lg p-1 mb-6 border border-border">
          <button
            onClick={() => { setAuthTab("register"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              authTab === "register"
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-[color:var(--text-color)]"
            }`}
            disabled={isSubmitting}
          >
            New User
          </button>
          <button
            onClick={() => { setAuthTab("login"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              authTab === "login"
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-[color:var(--text-color)]"
            }`}
            disabled={isSubmitting}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{authTab === "login" ? "Sign In Error:" : "Initialization Error:"}</span> {error}
            </div>
          </div>
        )}

        {authTab === "register" ? (
          <>
            <h1 className="text-xl font-medium mb-2">Welcome to Synthos</h1>
            <p className="text-sm text-muted mb-6">Enter your details to start generating synthetic data.</p>

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="userName" className="text-xs font-mono text-muted uppercase tracking-wider">Your Name</label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  disabled={isSubmitting}
                  className="w-full bg-base border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-[color:var(--text-color)] placeholder:text-muted/50 disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="projectName" className="text-xs font-mono text-muted uppercase tracking-wider">First Project Name</label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. E-commerce Schema"
                  disabled={isSubmitting}
                  className="w-full bg-base border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-[color:var(--text-color)] placeholder:text-muted/50 disabled:opacity-50"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-4 py-6 text-base flex items-center justify-center gap-2"
                disabled={!projectName.trim() || !userName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Initializing Workspace...
                  </>
                ) : (
                  <>Create Project &rarr;</>
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium mb-2">Sign In</h1>
            <p className="text-sm text-muted mb-6">Paste your User ID to resume your workspace.</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="loginUserId" className="text-xs font-mono text-muted uppercase tracking-wider">User ID</label>
                <input
                  id="loginUserId"
                  type="text"
                  value={loginUserId}
                  onChange={(e) => setLoginUserId(e.target.value)}
                  placeholder="e.g. 8bb92749-..."
                  disabled={isSubmitting}
                  className="w-full bg-base border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-[color:var(--text-color)] placeholder:text-muted/50 disabled:opacity-50"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-4 py-6 text-base flex items-center justify-center gap-2"
                disabled={!loginUserId.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Sign In &rarr;</>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
