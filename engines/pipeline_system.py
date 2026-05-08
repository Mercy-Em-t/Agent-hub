# engines/pipeline_system.py
import os
import math
from datetime import datetime

try:
    import bpy
    BLENDER_ACTIVE = True
except ImportError:
    BLENDER_ACTIVE = False


class PipelineConfig:
    """Standardized directory layout for the Cinematic Pipeline System."""
    def __init__(self, project_root="//"):
        self.root = project_root
        self.scripts_dir = os.path.join(project_root, "scripts")
        self.assets_blockout = os.path.join(project_root, "assets", "blockouts")
        self.assets_hero = os.path.join(project_root, "assets", "hero")
        self.renders_dailies = os.path.join(project_root, "renders", "dailies")
        self.renders_final = os.path.join(project_root, "renders", "final")
        self.audio_dir = os.path.join(project_root, "audio")


class AssetSwapper:
    """Handles the swapping of low-poly blockouts with high-fidelity hero assets."""
    def __init__(self, config):
        self.config = config

    def create_blockout_placeholder(self, name, size, location):
        """Creates primitive greybox placeholder."""
        if not BLENDER_ACTIVE:
            print(f"[MOCK Swapper] Created blockout placeholder '{name}' at {location}.")
            return None
            
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
        obj = bpy.context.active_object
        obj.name = f"BLOCKOUT_{name}"
        obj.scale = size
        # Assign grey blockout material
        mat = bpy.data.materials.get("Blockout_Mat") or bpy.data.materials.new("Blockout_Mat")
        mat.diffuse_color = (0.2, 0.2, 0.2, 1.0) # Grey
        obj.data.materials.append(mat)
        return obj

    def swap_to_hero(self, blockout_obj_name, hero_blend_name, hero_obj_name):
        """Swaps out a blockout object for a high-fidelity linked asset."""
        if not BLENDER_ACTIVE:
            print(f"[MOCK Swapper] Swapped blockout '{blockout_obj_name}' for hero asset '{hero_obj_name}'.")
            return
            
        blockout_obj = bpy.data.objects.get(blockout_obj_name)
        if not blockout_obj:
            print(f"Error: Blockout '{blockout_obj_name}' not found.")
            return

        # Store position/rotation
        loc = blockout_obj.location.copy()
        rot = blockout_obj.rotation_euler.copy()
        
        # Load linked asset from Hero Library folder
        blend_path = os.path.join(self.config.assets_hero, hero_blend_name)
        if not os.path.exists(blend_path):
            print(f"Hero asset file not found at: {blend_path}. Using placeholder mesh.")
            return

        with bpy.data.libraries.load(blend_path, link=True) as (data_from, data_to):
            if hero_obj_name in data_from.objects:
                data_to.objects = [hero_obj_name]
                
        if data_to.objects:
            hero_obj = data_to.objects[0]
            bpy.context.collection.objects.link(hero_obj)
            hero_obj.location = loc
            hero_obj.rotation_euler = rot
            
            # Delete original blockout placeholder
            bpy.data.objects.remove(blockout_obj, do_unlink=True)
            print(f"Successfully swapped {blockout_obj_name} with linked Hero asset {hero_obj_name}.")


class AudioSequencer:
    """Automatically loads and aligns dialogue/sound effects onto the Blender VSE timeline."""
    def __init__(self, config):
        self.config = config

    def load_audio_at_frame(self, filename, start_frame, channel=1):
        """Appends audio strip to VSE sequencer."""
        if not BLENDER_ACTIVE:
            print(f"[MOCK Sequencer] Appended audio '{filename}' at frame {start_frame} on channel {channel}.")
            return
            
        audio_path = os.path.join(self.config.audio_dir, filename)
        if not os.path.exists(audio_path):
            print(f"Audio file not found at: {audio_path}. Skipping sequencer track.")
            return

        # Ensure Sequencer is initialized
        if not bpy.context.scene.sequence_editor:
            bpy.context.scene.sequence_editor_create()

        seq = bpy.context.scene.sequence_editor.sequences.new_sound(
            name=filename,
            filepath=audio_path,
            channel=channel,
            frame_start=start_frame
        )
        print(f"Linked sound {filename} to Frame {start_frame}.")


# --- Blender Custom Operator UI Panels (If running inside Blender) ---
if BLENDER_ACTIVE:
    def update_mood_slider(self, context):
        """Dynamic update-handler driving volumetric color and energy based on Mood Slider."""
        mood = context.scene.scenegen_mood
        light_obj = bpy.data.objects.get("SunlightShafts")
        if light_obj and light_obj.type == 'LIGHT':
            # Lerp color from Cool White (0.0) to Golden Amber (1.0)
            light_obj.data.color = (1.0, 0.72 + (0.18 * (1.0 - mood)), 0.07 + (0.73 * (1.0 - mood)))
            # Scale energy dynamically
            light_obj.data.energy = 100.0 + (150.0 * mood)

    class VIEW3D_PT_cinematic_pipeline(bpy.types.Panel):
        bl_space_type = 'VIEW_3D'
        bl_region_type = 'UI'
        bl_category = 'Cinematic Pipeline'
        bl_label = 'Director Control Board'

        def draw(self, context):
            layout = self.layout
            layout.label(text="PRE-VIZ OPERATIONS")
            layout.operator("pipeline.generate_blockout", text="Generate Blockout (3D)")
            layout.operator("pipeline.review_gaze", text="Review Gaze Range (120-160)")
            layout.operator("pipeline.export_daily", text="Export 360p Daily (MP4)")
            
            layout.separator()
            layout.label(text="ATMOSPHERE CONTROLLER")
            # Draw the custom Mood Slider in the Blender UI Panel
            layout.prop(context.scene, "scenegen_mood", slider=True, text="Mood (Protected)")

    class OBJECT_OT_generate_blockout(bpy.types.Operator):
        bl_idname = "pipeline.generate_blockout"
        bl_label = "Generate Blockout"
        
        def execute(self, context):
            config = PipelineConfig()
            swapper = AssetSwapper(config)
            swapper.create_blockout_placeholder("Desk", (1.2, 0.8, 0.1), (0.0, 2.0, 0.8))
            swapper.create_blockout_placeholder("Girl_Body", (0.2, 0.2, 0.8), (0.0, 2.0, 0.7))
            self.report({'INFO'}, "Block-out placeholders built successfully!")
            return {'FINISHED'}

    class OBJECT_OT_review_gaze(bpy.types.Operator):
        bl_idname = "pipeline.review_gaze"
        bl_label = "Review Gaze Range"
        
        def execute(self, context):
            bpy.context.scene.frame_start = 120
            bpy.context.scene.frame_end = 160
            bpy.context.scene.frame_current = 120
            bpy.ops.screen.animation_play()
            return {'FINISHED'}

    class OBJECT_OT_export_daily(bpy.types.Operator):
        bl_idname = "pipeline.export_daily"
        bl_label = "Export Daily"
        
        def execute(self, context):
            scene = bpy.context.scene
            scene.render.image_settings.file_format = 'FFMPEG'
            scene.render.ffmpeg.format = 'MPEG4'
            scene.render.ffmpeg.codec = 'H264'
            scene.render.resolution_x = 640
            scene.render.resolution_y = 360
            scene.render.filepath = os.path.join(bpy.path.abspath("//"), "renders", "dailies", "frame_5_daily.mp4")
            bpy.ops.render.render(animation=True)
            self.report({'INFO'}, f"Render Complete! Saved to renders/dailies/")
            return {'FINISHED'}


def register():
    if BLENDER_ACTIVE:
        bpy.utils.register_class(VIEW3D_PT_cinematic_pipeline)
        bpy.utils.register_class(OBJECT_OT_generate_blockout)
        bpy.utils.register_class(OBJECT_OT_review_gaze)
        bpy.utils.register_class(OBJECT_OT_export_daily)
        
        # Register custom Scene property for Mood Slider
        bpy.types.Scene.scenegen_mood = bpy.props.FloatProperty(
            name="Mood Factor",
            description="Fades from Cold Mechanical (0.0) to Protected Sanctuary (1.0)",
            default=0.85,
            min=0.0,
            max=1.0,
            update=update_mood_slider
        )


def unregister():
    if BLENDER_ACTIVE:
        bpy.utils.unregister_class(VIEW3D_PT_cinematic_pipeline)
        bpy.utils.unregister_class(OBJECT_OT_generate_blockout)
        bpy.utils.unregister_class(OBJECT_OT_review_gaze)
        bpy.utils.unregister_class(OBJECT_OT_export_daily)
        del bpy.types.Scene.scenegen_mood


if __name__ == "__main__":
    if BLENDER_ACTIVE:
        register()
    else:
        # CLI Run Mock Demo
        cfg = PipelineConfig()
        sw = AssetSwapper(cfg)
        seq = AudioSequencer(cfg)
        print("=== PIPELINE SYSTEM DRY-RUN ===")
        sw.create_blockout_placeholder("Desk", (1.2, 0.8, 0.1), (0.0, 2.0, 0.8))
        sw.swap_to_hero("BLOCKOUT_Desk", "Desk_Set.blend", "Hero_Oak_Desk")
        seq.load_audio_at_frame("choir_swell.wav", 140, channel=1)
        seq.load_audio_at_frame("quiet_sigh.wav", 180, channel=2)
