# engines/render_sanctuary.py
import math
import sys
from datetime import datetime

# Safe import for Blender Python environment (bpy)
try:
    import bpy
    BLENDER_ACTIVE = True
except ImportError:
    BLENDER_ACTIVE = False


class BlenderPreVizCompiler:
    """
    Compiles and constructs the 'Sentient Sanctuary' scene within Blender.
    Generates meshes, materials, volumetric spot lamps, and curves for the U-turn camera.
    """
    def __init__(self):
        self.diary = []
        self.log("Blender Pre-Viz Compiler Initialized.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "message": message})
        print(f"[{timestamp}] [BlenderCompiler] {message}")

    def clear_scene(self):
        """Clears default meshes in Blender."""
        if BLENDER_ACTIVE:
            self.log("bpy active: Clearing default Blender scene elements.")
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)
        else:
            self.log("[MOCK bpy] Clearing default collection meshes (Cube, Camera, Light).")

    def create_geometry(self):
        """Builds desk, bookshelves, and chair."""
        self.log("Assembling geometry assets...")
        
        if BLENDER_ACTIVE:
            # Create Writing Desk
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 2.0, 0.0), scale=(1.2, 0.8, 0.75))
            desk = bpy.context.active_object
            desk.name = "WritingDesk_Oak"
            
            # Create Left Bookshelf
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-1.5, 2.0, 0.5), scale=(0.4, 1.5, 2.0))
            left_shelf = bpy.context.active_object
            left_shelf.name = "LeftBookshelf"
            
            # Create Right Bookshelf
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.5, 2.0, 0.5), scale=(0.4, 1.5, 2.0))
            right_shelf = bpy.context.active_object
            right_shelf.name = "RightBookshelf"

            # Create Character stand-in
            bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=1.4, location=(0.0, 2.0, 0.8))
            character = bpy.context.active_object
            character.name = "Character_Girl"
            
            self.log("Successfully created 3D mesh representations in Blender context.")
        else:
            self.log("[MOCK mesh] Created cube mesh 'WritingDesk_Oak' scaled [1.2, 0.8, 0.75] at (0.0, 2.0, 0.0).")
            self.log("[MOCK mesh] Created cube mesh 'LeftBookshelf' scaled [0.4, 1.5, 2.0] at (-1.5, 2.0, 0.5).")
            self.log("[MOCK mesh] Created cube mesh 'RightBookshelf' scaled [0.4, 1.5, 2.0] at (1.5, 2.0, 0.5).")
            self.log("[MOCK mesh] Created cylinder mesh 'Character_Girl' (stand-in) at (0.0, 2.0, 0.8).")

    def setup_lighting_and_volumetrics(self):
        """Sets up diagonal volumetric gold sunlight shafts, drifting silk curtains, and wind physics."""
        self.log("Configuring sunlight lines, volumetric scattering, and drifting curtains...")
        
        if BLENDER_ACTIVE:
            # Create Volumetric Spotlight (Sun Shafts)
            light_data = bpy.data.lights.new(name="SunlightShafts_Data", type='SPOT')
            light_object = bpy.data.objects.new(name="SunlightShafts", object_data=light_data)
            bpy.context.collection.objects.link(light_object)
            light_object.location = (-3.0, -2.0, 4.0)
            light_data.energy = 250.0  # Watts
            light_data.spot_size = math.radians(45)
            light_data.spot_blend = 0.5
            light_data.color = (1.0, 0.72, 0.07)  # Warm Gold
            
            # Create Curtain Plane for Cloth Shadow Mask
            bpy.ops.mesh.primitive_plane_add(size=1.0, location=(-2.8, -1.8, 3.8))
            curtain = bpy.context.active_object
            curtain.name = "Curtain_Silk"
            
            # Apply Cloth Simulation modifier
            bpy.ops.object.modifier_add(type='CLOTH')
            cloth_mod = curtain.modifiers["Cloth"]
            cloth_mod.settings.quality = 5
            cloth_mod.settings.mass = 0.15  # Silk mass
            
            # Create Wind Force Field to animate the curtain
            bpy.ops.object.effector_add(type='WIND', location=(-3.5, -2.0, 3.8))
            wind = bpy.context.active_object
            wind.name = "Wind_Force"
            wind.field.strength = 1.2
            
            # Enable Volumetric cycles scatter and build World Volume Node setup
            bpy.context.scene.render.engine = 'CYCLES'
            bpy.context.scene.cycles.volume_step_rate = 1.0
            
            world = bpy.context.scene.world
            if world:
                world.use_nodes = True
                nodes = world.node_tree.nodes
                links = world.node_tree.links
                
                # Setup Volume Scatter node for dust particles/fog
                volume_node = nodes.get("Volume Scatter") or nodes.new("ShaderNodeVolumeScatter")
                volume_node.inputs['Density'].default_value = 0.04
                volume_node.inputs['Anisotropy'].default_value = 0.80
                volume_node.inputs['Color'].default_value = (1.0, 0.95, 0.88, 1.0) # Warm amber dust
                
                output_node = nodes.get("World Output")
                if output_node:
                    links.new(volume_node.outputs['Volume'], output_node.inputs['Volume'])
            
            self.log("Successfully instantiated directional warm spotlight, wind-driven cloth shadow curtain, and volumetric World Scatter nodes.")
        else:
            self.log("[MOCK light] Created Spot Lamp 'SunlightShafts' at (-3.0, -2.0, 4.0), Color: Gold, Energy: 250W.")
            self.log("[MOCK light] Created Plane 'Curtain_Silk' at (-2.8, -1.8, 3.8) with active Cloth Simulation.")
            self.log("[MOCK light] Created Force Field 'Wind_Force' at (-3.5, -2.0, 3.8) to simulate organic curtain drifts.")
            self.log("[MOCK light] Enabled Cycles volumetric scatter with density 0.04 and anisotropy 0.80 (Warm dust nodes active).")

    def rig_and_animate_camera(self):
        """Rigs the sentient camera and keyframes the U-Turn trajectory."""
        self.log("Setting up camera rig and keyframing U-Turn trajectory...")
        
        if BLENDER_ACTIVE:
            # Create Camera
            cam_data = bpy.data.cameras.new(name="SentientCamera_Data")
            cam_obj = bpy.data.objects.new(name="SentientCamera", object_data=cam_data)
            bpy.context.collection.objects.link(cam_obj)
            bpy.context.scene.camera = cam_obj
            
            # Animate Camera Trajectory (U-Turn Keyframes)
            # Frame 0: Start of Panning
            cam_obj.location = (0.0, -6.0, 2.0)
            cam_obj.keyframe_insert(data_path="location", frame=1)
            
            # Frame 60: Drift Past Shoulder
            cam_obj.location = (0.0, -3.0, 1.6)
            cam_obj.keyframe_insert(data_path="location", frame=60)
            
            # Frame 140: Pivot to face her (The U-Turn complete)
            cam_obj.location = (0.5, 2.0, 1.4)
            cam_obj.keyframe_insert(data_path="location", frame=140)

            # Frame 200: Gaze lock holding position
            cam_obj.location = (0.2, -0.5, 1.7)
            cam_obj.keyframe_insert(data_path="location", frame=200)
            
            # Add Gaze Track constraint to lock her face to the camera
            constraint = cam_obj.constraints.new(type='TRACK_TO')
            constraint.target = bpy.data.objects.get("Character_Girl")
            constraint.track_axis = 'TRACK_NEGATIVE_Z'
            constraint.up_axis = 'UP_Y'
            
            self.log("Cinematic camera keyframes and Track-To gaze constraints bound successfully.")
        else:
            self.log("[MOCK camera] Created camera object 'SentientCamera' at (0.0, -6.0, 2.0).")
            self.log("[MOCK camera] Keyframe Frame 1: Location = (0.0, -6.0, 2.0) [Panning Start].")
            self.log("[MOCK camera] Keyframe Frame 60: Location = (0.0, -3.0, 1.6) [Drift Past Shoulder].")
            self.log("[MOCK camera] Keyframe Frame 140: Location = (0.5, 2.0, 1.4) [U-Turn Pivot Complete].")
            self.log("[MOCK camera] Keyframe Frame 200: Location = (0.2, -0.5, 1.7) [Gaze Lock].")
            self.log("[MOCK camera] Track-To Constraint active: Focusing lens on Character Cylinder Stand-In.")

    def setup_render_output(self):
        """Configures EEVEE real-time rendering engine and FFMPEG MP4 output settings for speed."""
        self.log("Configuring 360p EEVEE real-time MP4 render output...")
        
        if BLENDER_ACTIVE:
            scene = bpy.context.scene
            scene.frame_end = 350
            scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'BLENDER_EEVEE_NEXT') else 'BLENDER_EEVEE'
            scene.render.resolution_x = 640
            scene.render.resolution_y = 360
            scene.render.resolution_percentage = 100
            
            # Specify FFMPEG MP4 output
            scene.render.image_settings.file_format = 'FFMPEG'
            scene.render.ffmpeg.format = 'MPEG4'
            scene.render.ffmpeg.codec = 'H264'
            scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
            scene.render.filepath = "//frame_5_prototype.mp4"
            
            self.log("Rendering engine successfully set to EEVEE 360p MP4 (H.264).")
        else:
            self.log("[MOCK render] Set engine to BLENDER_EEVEE at 640x360 resolution.")
            self.log("[MOCK render] Configured FFMPEG H264 MP4 export to filepath: '//frame_5_prototype.mp4'.")

    def run_previz(self):
        self.clear_scene()
        self.create_geometry()
        self.setup_lighting_and_volumetrics()
        self.rig_and_animate_camera()
        self.setup_render_output()
        self.log("Pre-Viz Scene Construction & Render Setup Completed successfully!")


if __name__ == "__main__":
    compiler = BlenderPreVizCompiler()
    compiler.run_previz()
