import os
import json
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 5000
PROJECTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "projects"))

# Ensure projects directory exists
os.makedirs(PROJECTS_DIR, exist_ok=True)

class LocalStudioBridge(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/projects':
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # List all local isolated projects
            try:
                projects = []
                if os.path.exists(PROJECTS_DIR):
                    for name in os.listdir(PROJECTS_DIR):
                        proj_path = os.path.join(PROJECTS_DIR, name)
                        if os.path.isdir(proj_path):
                            state_file = os.path.join(proj_path, "project_state.json")
                            state_data = {}
                            if os.path.exists(state_file):
                                with open(state_file, "r") as f:
                                    state_data = json.load(f)
                            projects.append({"name": name, "state": state_data})
                
                self.wfile.write(json.dumps({"success": True, "projects": projects}).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf-8'))

        if self.path == '/api/save':
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            project_name = payload.get("projectName", "default_project")
            state_data = payload.get("state", {})
            
            try:
                # Create isolated project directories
                proj_dir = os.path.join(PROJECTS_DIR, project_name)
                os.makedirs(os.path.join(proj_dir, "assets"), exist_ok=True)
                os.makedirs(os.path.join(proj_dir, "renders"), exist_ok=True)
                os.makedirs(os.path.join(proj_dir, "audio"), exist_ok=True)
                
                state_file = os.path.join(proj_dir, "project_state.json")
                with open(state_file, "w") as f:
                    json.dump(state_data, f, indent=2)
                
                self.wfile.write(json.dumps({"success": True, "message": f"Saved {project_name} state locally."}).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

        elif self.path == '/api/render':
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "render_sanctuary.py"))
            
            try:
                # Spawn local Blender as a background rendering process
                cmd = ["blender", "--background", "--python", script_path]
                self.log_message(f"Running command: {' '.join(cmd)}")
                
                # We run with shell=True on Windows to handle system paths safely
                process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
                
                self.wfile.write(json.dumps({
                    "success": True,
                    "stdout": process.stdout,
                    "stderr": process.stderr,
                    "message": "Render completed successfully."
                }).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

def run():
    print(f"🎬 Local Cinematic Studio Bridge starting on http://localhost:{PORT}")
    print(f"📁 Local hard-drive workspace: {PROJECTS_DIR}")
    print("Press Ctrl + C to stop the local bridge.")
    server = HTTPServer(('localhost', PORT), LocalStudioBridge)
    server.serve_forever()

if __name__ == '__main__':
    run()
