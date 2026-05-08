# engines/main.py
import json
import sys
import os
from datetime import datetime

# Resolve subdirectory paths safely
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
sys.path.append(os.path.join(current_dir, "rigs"))
sys.path.append(os.path.join(current_dir, "animation"))
sys.path.append(os.path.join(current_dir, "core"))

from scenebuilder import SceneBuilder
from camerarig import CameraRig
from headrig import HeadRig
from keyframes import KeyframeAnimator
from timing import AnimationTiming
from engine import CoreEngine

# Import new Cinematic Director systems
from storyboard import Shot, StoryboardPlayer
from noise import CameraNoiseGenerator
from scheduler import Event, FrameScheduler
from cinematic_graph import CinematicNode, CinematicGraphEngine

class EngineFactoryEntity:
    """
    Constructs, integrates, and describes the full Engine pipeline with its own diary.
    Now extended with 4 cinematic director sub-systems.
    """
    def __init__(self):
        self.creation_time = datetime.now().isoformat()
        self.diary = []
        self.log("Initializing Self-Describing Cinematic Engine Factory Entity.")
        
        # Integrate internal 3D systems
        self.scene = SceneBuilder("IndustrialDroneScene")
        self.camera = CameraRig("CinematicTrack")
        self.head = HeadRig("DroneCameraHead")
        self.animator = KeyframeAnimator()
        self.timing = AnimationTiming(30)
        self.core = CoreEngine()

        # Integrate new Cinematic Director systems
        self.noise_generator = CameraNoiseGenerator()
        self.scheduler = FrameScheduler()
        self.graph_engine = CinematicGraphEngine()

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "message": message})
        print(f"[{timestamp}] [EngineFactory] {message}")

    def execute_cinematic_pipeline(self):
        self.log("Executing Advanced Cinematic Director pipeline...")

        # 🎬 Upgrade 1: Visual Storyboard System
        self.log("Setting up Storyboard system with film shots.")
        player = StoryboardPlayer(self.camera, self.animator)
        
        shot1 = Shot(name="establish_room", start=(0, -6, 2), end=(0, -3, 1.6), duration=60, mood="establishing", fov=65.0)
        shot2 = Shot(name="character_introduction", start=(0, -3, 1.6), end=(0.5, 2, 1.4), focus="girl", duration=80, mood="curious", fov=55.0)
        shot3 = Shot(name="look_back_moment", start=(0.5, 2, 1.4), end=(0.2, -0.5, 1.7), focus="girl_face", duration=60, mood="dramatic", fov=45.0)
        
        player.add_shot(shot1)
        player.add_shot(shot2)
        player.add_shot(shot3)
        
        # Play storyboard shots
        total_frames = player.play(start_frame=0)

        # 🌊 Upgrade 2: Motion Noise Layer (Procedural Noise)
        # Apply realistic breathing drift to animator
        self.noise_generator.apply_noise_to_animator(self.animator, start_frame=0, end_frame=total_frames, preset="breathing", intensity=1.2)
        # Inject handheld shake to current camera rig location
        noisy_cam_pos = self.noise_generator.inject_noise_to_location(self.camera.location if hasattr(self.camera, 'location') else (0.5, 2.0, 1.4), frame=120, preset="handheld", intensity=1.5)
        self.log(f"Injected shaky handheld noise offset at Frame 120. Base pos -> Noisy pos: {noisy_cam_pos}")

        # 🎞️ Upgrade 3: Frame Scheduler (Timeline Events)
        self.log("Scheduling director timeline events.")
        self.scheduler.add_event(Event(frame=1, action="start_scene"))
        self.scheduler.add_event(Event(frame=60, action="camera_move", payload={"fov": 50.0}))
        self.scheduler.add_event(Event(frame=120, action="girl_notices", payload={"intensity": 0.85}))
        self.scheduler.add_event(Event(frame=140, action="look_back", payload={"angle": 45.0, "intensity": 0.9}))
        self.scheduler.add_event(Event(frame=180, action="hold_stare"))

        # Execute scheduled events
        self.scheduler.run_events(self.core, self.scene, self.camera, self.head)

        # 🎬 Upgrade 4: Full Branching Cinematic Graph System
        self.log("Constructing Branching Cinematic Graph.")
        
        node_room = CinematicNode("room_intro", "Wide angle room overview.")
        node_walk_in = CinematicNode("walk_in", "Drone tracking shot as character enters.")
        node_reaction = CinematicNode("reaction_shot", "Dramatic close-up reaction as character notices camera.")
        node_suspense = CinematicNode("suspense_hold", "Tense quiet moment as character looks away.")

        # Establish branching links with conditions
        node_room.add_branch(node_walk_in)
        node_walk_in.add_branch(node_reaction, condition="mood=dramatic")
        node_walk_in.add_branch(node_suspense, condition="mood=suspense")

        # Define dynamic actions when entering nodes
        node_room.add_action(lambda ctx: self.camera.update_fov(60.0))
        node_walk_in.add_action(lambda ctx: self.camera.track_target("drone_scan_target"))
        node_reaction.add_action(lambda ctx: self.head.set_expression_weight("smile", 0.95))
        node_suspense.add_action(lambda ctx: self.camera.update_fov(35.0))

        # Run the branching logic engine (Evaluating dramatic branch)
        context = {"mood": "dramatic"}
        self.log(f"Running graph with context: {context}")
        graph_path = self.graph_engine.run_graph(node_room, context=context)
        self.log(f"Branching Graph Executed successfully. Narrative Path Taken: {' -> '.join(graph_path)}")

    def execute_pipeline(self):
        self.log("Beginning factory assembly pipeline.")
        self.core.boot()
        
        # Build scene assets
        self.scene.add_mesh("Drone_Base_Frame", "quad_chassis", (0, 0, 0))
        self.scene.add_mesh("Rotor_FL", "blade_assembly", (-1, 1, 0.5))
        self.scene.add_mesh("Rotor_FR", "blade_assembly", (1, 1, 0.5))
        scene_data = self.scene.build()

        # Rig system
        self.camera.track_target("Drone_Base_Frame")
        self.head.set_expression_weight("lens_zoom", 0.8)

        # Animate rotor rotations
        self.animator.add_keyframe(0, "Rotor_FL_Rotation", 0)
        self.animator.add_keyframe(30, "Rotor_FL_Rotation", 360)

        # Execute our cinematic upgrades pipeline!
        self.execute_cinematic_pipeline()

        self.log("Pipeline run complete. Compiling self-description registry.")

        # Compile self-description
        self_description = {
            "entity": "EngineFactoryEntity",
            "constructed_at": self.creation_time,
            "status": "healthy",
            "systems": {
                "scene_builder": {
                    "definition": "Constructs and builds 3D scenes with mesh assets.",
                    "methods": ["add_mesh", "build"],
                    "data": scene_data
                },
                "camera_rig": {
                    "definition": "Controls camera positioning, lenses, tracking, and target rigging.",
                    "methods": ["track_target", "update_fov"],
                    "data": {"fov": self.camera.fov, "target": self.camera.target}
                },
                "head_rig": {
                    "definition": "Manages facial rigging, mouth shapes, and head orientation.",
                    "methods": ["set_expression_weight"],
                    "data": {"expressions": self.head.expressions}
                },
                "animator": {
                    "definition": "Stores and interpolates keyframe coordinates.",
                    "methods": ["add_keyframe"],
                    "data": {"keyframes": self.animator.keyframes}
                },
                "storyboard": {
                    "definition": "Manages discrete film shots, and handles frame-by-frame interpolation.",
                    "data": {"history": [entry for entry in self.diary if "storyboard" in entry.get("message", "").lower()]}
                },
                "motion_noise": {
                    "definition": "Simulates micro shakes and breathing drifts mathematically.",
                    "data": {"preset_applied": "breathing"}
                },
                "frame_scheduler": {
                    "definition": "Dispatches timeline-driven director actions chronologically.",
                    "data": {"events_scheduled": len(self.scheduler.events)}
                },
                "cinematic_graph": {
                    "definition": "Branching film narrative graph with evaluation nodes.",
                    "data": {"path_taken": self.graph_engine.execution_path}
                }
            },
            "diary_of_itself": self.diary + self.scene.diary + self.camera.diary + self.head.diary + self.animator.diary + self.core.diary + self.noise_generator.diary + self.scheduler.diary + self.graph_engine.diary
        }
        return self_description

if __name__ == "__main__":
    factory = EngineFactoryEntity()
    result = factory.execute_pipeline()
    print("\n--- SELF-DESCRIPTION DIARY ---")
    print(json.dumps(result, indent=2))
