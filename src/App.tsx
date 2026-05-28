/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Stepper } from "./components/layout/Stepper";
import { Step1Schema } from "./components/steps/Step1Schema";
import { Step2Data } from "./components/steps/Step2Data";
import { Step3Export } from "./components/steps/Step3Export";
import { Onboarding } from "./components/onboarding/Onboarding";
import { synthosApi } from "./lib/synthosApi";
import { Loader2 } from "lucide-react";

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [projectName, setProjectName] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  // Validate session on mount
  useEffect(() => {
    async function validateSession() {
      const cachedUserId = localStorage.getItem("synthos_user_id");
      const cachedProjectId = localStorage.getItem("synthos_project_id");

      if (cachedUserId) {
        try {
          // Verify user exists
          const user = await synthosApi.getUser(cachedUserId);
          setUserId(user.user_id);
          setUserName(user.name);

          // Optionally verify and load active project
          if (cachedProjectId) {
            try {
              const project = await synthosApi.getProject(cachedProjectId);
              setProjectId(project.project_id);
              setProjectName(project.project_name);
              setIsOnboarded(true);
            } catch (pErr) {
              console.warn("Cached project invalid, clearing active project:", pErr);
              localStorage.removeItem("synthos_project_id");
            }
          }
        } catch (err) {
          console.warn("Failed to validate cached user session, clearing cache:", err);
          localStorage.removeItem("synthos_user_id");
          localStorage.removeItem("synthos_project_id");
        }
      }
      setIsLoadingSession(false);
    }
    validateSession();
  }, []);

  const toggleTheme = () => {
    setTheme(t => t === "dark" ? "light" : "dark");
  };

  const handleSwitchProject = () => {
    setProjectId(null);
    setProjectName("");
    setIsOnboarded(false);
    localStorage.removeItem("synthos_project_id");
  };

  const handleLogout = () => {
    localStorage.removeItem("synthos_user_id");
    localStorage.removeItem("synthos_project_id");
    setUserId(null);
    setUserName("");
    setProjectId(null);
    setProjectName("");
    setIsOnboarded(false);
  };

  if (isLoadingSession) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-base text-[color:var(--text-color)] font-sans">
        <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
        <p className="text-sm font-mono text-muted animate-pulse">Restoring your session...</p>
      </div>
    );
  }

  // Show onboarding (either name registration or projects dashboard) if not in active project
  if (!isOnboarded || !projectId) {
    return (
      <Onboarding 
        userId={userId}
        onComplete={(pId, uId, pName, uName) => {
          setProjectId(pId);
          setUserId(uId);
          setProjectName(pName);
          setUserName(uName);
          setIsOnboarded(true);
        }} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base text-[color:var(--text-color)] font-sans transition-colors overflow-hidden">
      <Stepper
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        theme={theme}
        toggleTheme={toggleTheme}
        projectName={projectName}
        onSwitchProject={handleSwitchProject}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col relative">
        {currentStep === 1 && (
          <Step1Schema 
            onNext={() => setCurrentStep(2)} 
            theme={theme} 
            projectName={projectName}
            userName={userName}
            userId={userId!}
            projectId={projectId!}
          />
        )}
        {currentStep === 2 && <Step2Data onNext={() => setCurrentStep(3)} />}
        {currentStep === 3 && <Step3Export onRestart={() => setCurrentStep(1)} />}
      </main>
    </div>
  );
}
