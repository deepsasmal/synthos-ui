import { cn } from "@/src/lib/utils";
import { Sun, Moon, LayoutGrid, LogOut } from "lucide-react";

interface StepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  projectName?: string;
  onSwitchProject?: () => void;
  onLogout?: () => void;
}

const steps = [
  { id: 1, title: "Schema Designer" },
  { id: 2, title: "Seed Data" },
  { id: 3, title: "Scale Dataset" },
  { id: 4, title: "Export" },
];

export function Stepper({ currentStep, onStepChange, theme, toggleTheme, projectName, onSwitchProject, onLogout }: StepperProps) {
  const currentStepTitle = steps.find(s => s.id === currentStep)?.title;

  return (
    <div className="w-full border-b border-border bg-base px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-accent rounded-sm flex items-center justify-center">
            <span className="text-accent-fg font-display font-bold text-[10px]">S</span>
          </div>
          <span className="font-display font-semibold text-[1rem] tracking-tight">Synthos</span>
        </div>
        {projectName && (
          <>
            <span className="text-border">/</span>
            <span className="font-mono text-xs text-muted truncate max-w-[150px]">{projectName}</span>
          </>
        )}
        {currentStepTitle && (
          <>
            <span className="text-border">/</span>
            <span className="text-xs font-medium text-accent px-2 py-0.5 bg-accent/10 rounded-full">{currentStepTitle}</span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {onSwitchProject && (
          <button
            onClick={onSwitchProject}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border rounded-md text-xs font-mono text-muted hover:text-[color:var(--text-color)] hover:border-muted transition-all"
            title="Go to Projects Dashboard"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/25 rounded-md text-xs font-mono text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
            title="Sign out and clear session"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        )}

        <div className="flex gap-1">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "h-1 w-6 rounded-full transition-all duration-300",
                currentStep >= step.id ? "bg-accent" : "bg-border"
              )}
            />
          ))}
        </div>
        
        <div className="h-4 w-px bg-border mx-2" />

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full hover:bg-surface-hover text-muted hover:text-[color:var(--text-color)] transition-colors"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
