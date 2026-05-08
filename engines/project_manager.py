# engines/project_manager.py
import os
import json
from datetime import datetime

class ProjectManager:
    """
    Manages multi-project isolation, directory structures, and state data persistence.
    Ensures projects are fully isolated from each other.
    """
    def __init__(self, workspace_root="c:/Users/LIZBETH/Desktop/Agentic Hub"):
        self.root = workspace_root
        self.projects_dir = os.path.join(workspace_root, "projects")
        self.ensure_projects_directory()

    def log(self, message):
        print(f"[{datetime.now().isoformat()}] [ProjectManager] {message}")

    def ensure_projects_directory(self):
        """Creates the master projects/ directory if it doesn't exist."""
        if not os.path.exists(self.projects_dir):
            os.makedirs(self.projects_dir)
            self.log(f"Created master projects directory at: {self.projects_dir}")

    def create_project(self, project_name):
        """Initializes a brand new isolated project structure with default states."""
        safe_name = "".join(c for c in project_name if c.isalnum() or c in ("_", "-")).lower().strip()
        proj_path = os.path.join(self.projects_dir, safe_name)
        
        if os.path.exists(proj_path):
            self.log(f"Project '{safe_name}' already exists.")
            return False

        # Create isolated sub-folders
        os.makedirs(os.path.join(proj_path, "assets", "hero"))
        os.makedirs(os.path.join(proj_path, "assets", "blockouts"))
        os.makedirs(os.path.join(proj_path, "renders", "dailies"))
        os.makedirs(os.path.join(proj_path, "renders", "final"))
        os.makedirs(os.path.join(proj_path, "audio"))
        
        # Initialize default project state
        default_state = {
            "metadata": {
                "title": project_name,
                "created_at": datetime.now().isoformat(),
                "version": "1.0.0"
            },
            "scene_layout": {
                "description": f"A brand new isolated scene for {project_name}.",
                "ascii_grid": "+------------------------------------+\n|                                    |\n|                                    |\n+------------------------------------+",
                "math_curve": "1 - Math.pow(1 - t, 2)"
            }
        }
        
        state_file = os.path.join(proj_path, "project_state.json")
        with open(state_file, "w") as f:
            json.dump(default_state, f, indent=2)

        self.log(f"Successfully initialized isolated project '{safe_name}' directory structure!")
        return True

    def list_projects(self):
        """Returns a list of all existing projects in the workspace."""
        if not os.path.exists(self.projects_dir):
            return []
        return [d for d in os.listdir(self.projects_dir) if os.path.isdir(os.path.join(self.projects_dir, d))]

    def load_project_state(self, project_name):
        """Loads the isolated state file for a specific project."""
        state_file = os.path.join(self.projects_dir, project_name.lower(), "project_state.json")
        if not os.path.exists(state_file):
            self.log(f"Project state for '{project_name}' not found.")
            return None
        with open(state_file, "r") as f:
            return json.load(f)

    def persist_project_state(self, project_name, state_data):
        """Saves or updates the isolated state file of a project."""
        safe_name = project_name.lower().strip()
        state_file = os.path.join(self.projects_dir, safe_name, "project_state.json")
        if not os.path.exists(os.path.dirname(state_file)):
            self.log(f"Cannot save state. Project directory '{safe_name}' does not exist.")
            return False
        with open(state_file, "w") as f:
            json.dump(state_data, f, indent=2)
        self.log(f"Successfully persisted state for isolated project '{safe_name}'.")
        return True


if __name__ == "__main__":
    pm = ProjectManager()
    # Mocking basic checks
    print("=== Isolated Multi-Project Manager Demo ===")
    pm.create_project("The Room Breathes")
    pm.create_project("Isolated Sanctuary")
    print(f"Active Projects: {pm.list_projects()}")
