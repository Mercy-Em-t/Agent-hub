// STATE MANAGEMENT & PROJECT PRESETS
const projectPresets = {
    the_room_breathes: {
        sceneDesc: "The camera enters past her shoulder, holding still as her pen pauses, then turns as she locks eyes.",
        asciiDiagram: "+------------------------------------+\n|  [H a l l w a y]                   |\n|         |                          |\n|         v                          |\n|  [W i n d o w]  ~~~> [D e s k]     |\n+------------------------------------+",
        mathPlot: "1 - Math.pow(1 - t, 3)",
        notebookDiary: `DIRECTOR'S WORKSPACE GUIDE: THE ROOM BREATHES\n===========================================\n\n[MATH-DRAFTED CAMERA PATH: Cubic Bezier Ease-Out]\n* Path Equation: Y(t) = 1 - (1 - t)^3\n* Kinematics: Rapid hallway approach that smoothly decelerates to a soft standstill at her shoulder.\n\n--- PRODUCTION NOTES & TUTORIALS ---\n\n1. TO GENERATE THE CINEMATIC FRAME:\n   --------------------------------\n   bpy.context.scene.render.engine = 'CYCLES'\n   bpy.context.scene.cycles.use_denoising = True\n   bpy.ops.render.render(write_still=True, filepath="/renders/frame_01.png")\n\n2. TO ADD A CAMERA RIG:\n   -------------------\n   bpy.ops.object.camera_add(location=(0, -4, 1.2), rotation=(1.57, 0, 0))\n   cam = bpy.context.active_object\n   bpy.context.scene.camera = cam\n\n3. HOW TO MAKE THE CAMERA MOVE DYNAMICALLY:\n   ----------------------------------------\n   for f in range(1, 200):\n       t = (f - 1) / 199\n       y_val = 1 - Math.pow(1 - t, 3)\n       cam.location.y = -4 + (y_val * 2.5)\n       cam.keyframe_insert(data_path="location", frame=f)\n\n4. HOW TO ADD AN OBJECT (Cylinder Stand-in):\n   -----------------------------------------\n   bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=1.4, location=(0, 2, 0.8))\n   obj = bpy.context.active_object\n   obj.name = "Girl_StandIn"\n\n5. HOW TO DEFINE OBJECT CHARACTERISTICS (Scale/Material):\n   ------------------------------------------------------\n   obj.scale = (1.1, 1.1, 1.1)\n   mat = bpy.data.materials.new(name="Emerald_Glow")\n   mat.use_nodes = True\n   nodes = mat.node_tree.nodes\n   # Set material color to emerald green:\n   nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.06, 0.72, 0.5, 1.0)\n   obj.data.materials.append(mat)\n\n6. HOW TO REMOVE AN OBJECT:\n   -------------------------\n   if "Girl_StandIn" in bpy.data.objects:\n       bpy.data.objects.remove(bpy.data.objects["Girl_StandIn"], do_unlink=True)`
    },
    isolated_sanctuary: {
        sceneDesc: "Deep in the abandoned forest tower, a single lantern burns as heavy wind sweeps through ancient books.",
        asciiDiagram: "+------------------------------------+\n|  [F o r e s t  T o w e r]          |\n|         * (Lantern)                |\n|         ~~~~~~~~> [W i n d]        |\n+------------------------------------+",
        mathPlot: "Math.sin(t * Math.PI * 2) * 1.5",
        notebookDiary: `DIRECTOR'S WORKSPACE GUIDE: ISOLATED SANCTUARY\n===========================================\n\n[MATH-DRAFTED CAMERA PATH: Sinusoidal Hover]\n* Path Equation: Y(t) = Math.sin(t * Math.PI * 2) * 1.5\n* Kinematics: Rhythmic sway and breathing oscillations simulating high winds sweeping ancient bookshelves.\n\n--- PRODUCTION NOTES & TUTORIALS ---\n\n1. TO GENERATE THE CINEMATIC FRAME:\n   --------------------------------\n   bpy.context.scene.render.resolution_x = 3840\n   bpy.context.scene.render.resolution_y = 2160\n   bpy.ops.render.render(write_still=True)\n\n2. TO ADD A CAMERA RIG:\n   -------------------\n   bpy.ops.object.camera_add(location=(0, -6, 1.8), rotation=(1.5, 0, 0))\n   cam = bpy.context.active_object\n   bpy.context.scene.camera = cam\n\n3. HOW TO MAKE THE CAMERA MOVE DYNAMICALLY:\n   ----------------------------------------\n   for f in range(1, 250):\n       t = (f - 1) / 249\n       cam.location.z = 1.8 + (Math.sin(t * Math.PI * 2) * 0.1)\n       cam.keyframe_insert(data_path="location", frame=f)\n\n4. HOW TO ADD AN OBJECT (Cube Desk Primitive):\n   ------------------------------------------\n   bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 2, 0))\n   obj = bpy.context.active_object\n   obj.name = "Ancient_Desk"\n\n5. HOW TO DEFINE OBJECT CHARACTERISTICS (Scale/Material):\n   ------------------------------------------------------\n   obj.scale = (2.0, 1.2, 0.8)\n   mat = bpy.data.materials.new(name="Parchment_Dust")\n   mat.use_nodes = True\n   # Add volumetric scattering node to simulate heavy dust around desk:\n   nodes = mat.node_tree.nodes\n   nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95\n   obj.data.materials.append(mat)\n\n6. HOW TO REMOVE AN OBJECT:\n   -------------------------\n   if "Ancient_Desk" in bpy.data.objects:\n       bpy.data.objects.remove(bpy.data.objects["Ancient_Desk"], do_unlink=True)`
    },
    cosmic_vessel: {
        sceneDesc: "Floating in orbit above Jupiter, the spacecraft camera pans slowly across the glass cockpit observing stardust.",
        asciiDiagram: "+------------------------------------+\n|  [J u p i t e r  O r b i t]        |\n|        o  o  o  (Cockpit Lights)   |\n|  ~~~~~~~~~~~~~~~~~> [Stardust]     |\n+------------------------------------+",
        mathPlot: "Math.cos(t * Math.PI) * 3.0",
        notebookDiary: `DIRECTOR'S WORKSPACE GUIDE: COSMIC VESSEL VOYAGE\n==============================================\n\n[MATH-DRAFTED CAMERA PATH: Harmonic Slow Pan]\n* Path Equation: Y(t) = Math.cos(t * Math.PI) * 3.0\n* Kinematics: Ultra-slow orbital panoramic sweep across high-metallic spacecraft glass frames.\n\n--- PRODUCTION NOTES & TUTORIALS ---\n\n1. TO GENERATE THE CINEMATIC FRAME:\n   --------------------------------\n   bpy.context.scene.frame_start = 1\n   bpy.context.scene.frame_end = 350\n   bpy.ops.render.render(animation=True)\n\n2. TO ADD A CAMERA RIG:\n   -------------------\n   bpy.ops.object.camera_add(location=(3.0, -3.0, 1.0))\n   cam = bpy.context.active_object\n   bpy.context.scene.camera = cam\n\n3. HOW TO MAKE THE CAMERA MOVE DYNAMICALLY:\n   ----------------------------------------\n   for f in range(1, 350):\n       t = (f - 1) / 349\n       cam.rotation_euler.z = -0.5 + (Math.cos(t * Math.PI) * 0.5)\n       cam.keyframe_insert(data_path="rotation_euler", frame=f)\n\n4. HOW TO ADD AN OBJECT (UV Sphere Stardust):\n   ------------------------------------------\n   bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(0, 4, 1.2))\n   obj = bpy.context.active_object\n   obj.name = "Stardust_Core"\n\n5. HOW TO DEFINE OBJECT CHARACTERISTICS (Scale/Material):\n   ------------------------------------------------------\n   obj.scale = (1.5, 1.5, 1.5)\n   mat = bpy.data.materials.new(name="Stardust_Glow")\n   mat.use_nodes = True\n   nodes = mat.node_tree.nodes\n   nodes['Principled BSDF'].inputs['Metallic'].default_value = 1.0\n   obj.data.materials.append(mat)\n\n6. HOW TO REMOVE AN OBJECT:\n   -------------------------\n   if "Stardust_Core" in bpy.data.objects:\n       bpy.data.objects.remove(bpy.data.objects["Stardust_Core"], do_unlink=True)`
    }
};

const state = {
    isPlaying: false,
    currentFrame: 0,
    curtainSpeed: 1.2,
    sunlightIntensity: 5.0,
    shelfPreset: 'lived-in',
    motionNoisePreset: 'breathing',
    smoothing: 0.85,
    activeProject: 'the_room_breathes',
    sceneDesc: "",
    asciiDiagram: "",
    mathPlot: "",
    focalPoint: 'diary', // diary or eyes
    playbackInterval: null
};

// DOM ELEMENTS
const el = {
    projectSelector: document.getElementById('project-selector'),
    shelfPreset: document.getElementById('shelf-preset'),
    curtainSpeed: document.getElementById('curtain-speed'),
    curtainSpeedVal: document.getElementById('curtain-speed-val'),
    lightIntensity: document.getElementById('light-intensity'),
    lightIntensityVal: document.getElementById('light-intensity-val'),
    sceneDesc: document.getElementById('scene-desc'),
    asciiDiagram: document.getElementById('ascii-diagram'),
    mathPlot: document.getElementById('math-plot'),
    
    viewport: document.getElementById('render-viewport'),
    viewportFrame: document.getElementById('viewport-frame-counter'),
    tab3d: document.getElementById('tab-3d'),
    tabCycles: document.getElementById('tab-cycles'),
    camLensStats: document.getElementById('cam-lens-stats'),
    timelineSlider: document.getElementById('timeline-slider'),
    markers: document.querySelectorAll('.narrative-markers .marker'),
    
    btnPlay: document.getElementById('btn-play'),
    btnPause: document.getElementById('btn-pause'),
    
    noisePreset: document.getElementById('noise-preset'),
    smoothing: document.getElementById('camera-smoothing'),
    smoothingVal: document.getElementById('camera-smoothing-val'),
    focalDiary: document.getElementById('focal-diary'),
    focalEyes: document.getElementById('focal-eyes'),
    
    audioBars: document.querySelectorAll('#audio-visualizer .bar'),
    swellBars: document.querySelectorAll('#audio-visualizer .bar.swell'),
    swellTxt: document.querySelector('.swell-txt'),
    
    codeBlock: document.getElementById('python-code-block'),
    btnCopy: document.getElementById('btn-copy'),
    
    suiteTabStoryboard: document.getElementById('suite-tab-storyboard'),
    suiteTabWhiteboard: document.getElementById('suite-tab-whiteboard'),
    suiteTabAscii: document.getElementById('suite-tab-ascii'),
    suiteTabLibrary: document.getElementById('suite-tab-library'),
    suiteTabDiary: document.getElementById('suite-tab-diary'),
    
    suiteContentStoryboard: document.getElementById('suite-content-storyboard'),
    suiteContentWhiteboard: document.getElementById('suite-content-whiteboard'),
    suiteContentAscii: document.getElementById('suite-content-ascii'),
    suiteContentLibrary: document.getElementById('suite-content-library'),
    suiteContentDiary: document.getElementById('suite-content-diary'),
    
    whiteboardCanvas: document.getElementById('whiteboard-canvas'),
    whiteboardDrawBtn: document.getElementById('whiteboard-draw-btn'),
    whiteboardEraseBtn: document.getElementById('whiteboard-erase-btn'),
    whiteboardClearBtn: document.getElementById('whiteboard-clear-btn'),
    
    asciiUpload: document.getElementById('ascii-upload'),
    asciiFileName: document.getElementById('ascii-file-name'),
    asciiOutputPre: document.getElementById('ascii-output-pre'),
    
    projectNotebookDiary: document.getElementById('project-notebook-diary'),
    
    localStatusDot: document.getElementById('local-bridge-status-dot'),
    localStatusTxt: document.getElementById('local-bridge-status-txt'),
    btnRunBlender: document.getElementById('btn-run-blender'),
    
    constructorType: document.getElementById('constructor-type'),
    constructorName: document.getElementById('constructor-name'),
    constructorX: document.getElementById('constructor-x'),
    constructorY: document.getElementById('constructor-y'),
    constructorZ: document.getElementById('constructor-z'),
    constructorScaleX: document.getElementById('constructor-scale-x'),
    constructorScaleY: document.getElementById('constructor-scale-y'),
    constructorScaleZ: document.getElementById('constructor-scale-z'),
    constructorMaterial: document.getElementById('constructor-material'),
    btnConstructorAdd: document.getElementById('btn-constructor-add'),
    btnConstructorDelete: document.getElementById('btn-constructor-delete'),
    constructorObjectsList: document.getElementById('constructor-objects-list')
};

// LIVE CODE GENERATOR
function generatePythonCode() {
    const cleanDesc = state.sceneDesc.replace(/"/g, '\\"');
    const commentAscii = state.asciiDiagram.split('\n').map(line => `#   ${line}`).join('\n');
    const code = `# Blender Python Script: Sentient Sanctuary (Dynamic Scene Compiler)
# Live Generated on: ${new Date().toISOString()}

import bpy
import math

# --- 1. SCENE DESCRIPTION & PROMPT ---
# Prompt: "${cleanDesc}"

# --- 2. ASCII LAYOUT DIAGRAM ---
${commentAscii}

# --- 3. SETUP ENVIRONMENT ---
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 200
scene.render.fps = 30
scene.render.engine = 'CYCLES'

# Preset Shelf Density: ${state.shelfPreset.toUpperCase()}
# Sunlight Volumetric Intensity: ${state.sunlightIntensity} kW
# Curtain Ripple Wave Frequency: ${state.curtainSpeed} Hz

def build_scene():
    # Clear existing meshes
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
${activeObjects.map(obj => {
    let s = "";
    if (obj.type === "cube") {
        s += `    # Add Cube Primitive: ${obj.name}\n`;
        s += `    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(${obj.x}, ${obj.y}, ${obj.z}), scale=(${obj.sx}, ${obj.sy}, ${obj.sz}))\n`;
        s += `    mesh_${obj.name} = bpy.context.active_object\n`;
        s += `    mesh_${obj.name}.name = "${obj.name}"`;
    } else if (obj.type === "cylinder") {
        s += `    # Add Cylinder Primitive: ${obj.name}\n`;
        s += `    bpy.ops.mesh.primitive_cylinder_add(radius=${obj.sx}, depth=${obj.sz}, location=(${obj.x}, ${obj.y}, ${obj.z}))\n`;
        s += `    mesh_${obj.name} = bpy.context.active_object\n`;
        s += `    mesh_${obj.name}.name = "${obj.name}"`;
    } else if (obj.type === "sphere") {
        s += `    # Add UV Sphere Primitive: ${obj.name}\n`;
        s += `    bpy.ops.mesh.primitive_uv_sphere_add(radius=${obj.sx}, location=(${obj.x}, ${obj.y}, ${obj.z}))\n`;
        s += `    mesh_${obj.name} = bpy.context.active_object\n`;
        s += `    mesh_${obj.name}.name = "${obj.name}"`;
    } else if (obj.type === "spotlight") {
        s += `    # Add Volumetric Spotlight: ${obj.name}\n`;
        s += `    light_data = bpy.data.lights.new(name="${obj.name}_Data", type='SPOT')\n`;
        s += `    light_obj = bpy.data.objects.new(name="${obj.name}", object_data=light_data)\n`;
        s += `    bpy.context.collection.objects.link(light_obj)\n`;
        s += `    light_obj.location = (${obj.x}, ${obj.y}, ${obj.z})`;
    }
    if (obj.mat && obj.type !== "spotlight") {
        s += `\n    mat_${obj.name} = bpy.data.materials.new(name="${obj.mat}")\n`;
        s += `    mat_${obj.name}.use_nodes = True\n`;
        s += `    mesh_${obj.name}.data.materials.append(mat_${obj.name})`;
    }
    return s;
}).join('\n\n')}

def setup_lighting():
    # Volumetric spotlight
    light_data = bpy.data.lights.new(name="SunlightShafts_Data", type='SPOT')
    light_obj = bpy.data.objects.new(name="SunlightShafts", object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = (-3.0, -2.0, 4.0)
    light_data.energy = ${state.sunlightIntensity * 50.0}
    light_data.spot_size = math.radians(45)
    light_data.spot_blend = 0.5
    light_data.color = (1.0, 0.72, 0.07)  # Warm Gold
    
    # Drifting Curtain mesh (Cloth Shadow Mask)
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(-2.8, -1.8, 3.8))
    curtain = bpy.context.active_object
    curtain.name = "Curtain_Silk"
    
    # Add cloth modifier and wind effector
    bpy.ops.object.modifier_add(type='CLOTH')
    curtain.modifiers["Cloth"].settings.mass = 0.15
    
    bpy.ops.object.effector_add(type='WIND', location=(-3.5, -2.0, 3.8))
    wind = bpy.context.active_object
    wind.name = "Wind_Force"
    wind.field.strength = ${state.curtainSpeed}

def setup_camera_rig():
    cam_data = bpy.data.cameras.new(name="SentientCamera_Data")
    cam_obj = bpy.data.objects.new(name="SentientCamera", object_data=cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    # Camera path coordinates keyframes (Smoothing Lerp: ${state.smoothing})
    # Live Camera Y-Axis Curve Equation: y = ${state.mathPlot}
    
    # Frame 1: Panning Start
    cam_obj.location = (0.0, -6.0, 2.0)
    cam_obj.keyframe_insert(data_path="location", frame=1)
    
    # Frame 60: Drift Past Shoulder
    cam_obj.location = (0.0, -3.0, 1.6)
    cam_obj.keyframe_insert(data_path="location", frame=60)
    
    # Frame 120: Pivot (U-Turn Complete)
    cam_obj.location = (0.5, 2.0, 1.4)
    cam_obj.keyframe_insert(data_path="location", frame=120)
    
    # Frame 200: Gaze Lock
    cam_obj.location = (0.2, -0.5, 1.7)
    cam_obj.keyframe_insert(data_path="location", frame=200)
    
    # Active Procedural Noise Preset: ${state.motionNoisePreset.toUpperCase()}
    # Active Focal Point: ${state.focalPoint.toUpperCase()}

# Executing pre-viz setup
build_scene()
setup_lighting()
setup_camera_rig()
`;
    el.codeBlock.textContent = code;
}

// EVENT LISTENERS & UPDATES
function updateStateAndUI() {
    // Inputs to State
    state.curtainSpeed = parseFloat(el.curtainSpeed.value);
    state.sunlightIntensity = parseFloat(el.lightIntensity.value);
    state.sceneDesc = el.sceneDesc.value;
    state.asciiDiagram = el.asciiDiagram.value;
    state.mathPlot = el.mathPlot.value;
    state.shelfPreset = el.shelfPreset.value;
    state.motionNoisePreset = el.noisePreset.value;
    state.smoothing = parseFloat(el.smoothing.value);
    
    // State to labels
    el.curtainSpeedVal.textContent = state.curtainSpeed.toFixed(1) + 'x';
    el.lightIntensityVal.textContent = state.sunlightIntensity.toFixed(1) + ' kW';
    el.smoothingVal.textContent = state.smoothing.toFixed(2);
    
    // Update Python Script Bridge
    generatePythonCode();
}

// TIMELINE PLAYER
function updateTimelineUI() {
    el.timelineSlider.value = state.currentFrame;
    
    // Zero pad frame index
    const zeroPad = (num, places) => String(num).padStart(places, '0');
    el.viewportFrame.textContent = `FRAME ${zeroPad(state.currentFrame, 3)} // 200`;
    
    // Highlight markers depending on frame ranges
    el.markers.forEach(marker => {
        const frame = parseInt(marker.getAttribute('data-frame'));
        if (state.currentFrame >= frame) {
            marker.classList.add('active');
        } else {
            marker.classList.remove('active');
        }
    });

    // Simulate Lens Flare Scale & Viewport drift based on U-turn frames
    if (state.currentFrame >= 60 && state.currentFrame <= 140) {
        const ratio = (state.currentFrame - 60) / 80;
        el.viewport.style.transform = `scale(${1.0 + ratio * 0.04}) rotate(${ratio * 0.5}deg)`;
        el.viewport.style.filter = `contrast(${1.0 + ratio * 0.1})`;
    } else if (state.currentFrame > 140) {
        el.viewport.style.transform = `scale(1.04) rotate(0.5deg)`;
    } else {
        el.viewport.style.transform = `scale(1.0) rotate(0deg)`;
        el.viewport.style.filter = `contrast(1.0)`;
    }

    // Focal point autotoggle on frame thresholds
    if (state.currentFrame >= 140) {
        setFocalPoint('eyes');
        el.swellBars.forEach(bar => bar.classList.add('active-swell'));
        el.swellTxt.classList.add('active-swell');
    } else {
        setFocalPoint('diary');
        el.swellBars.forEach(bar => bar.classList.remove('active-swell'));
        el.swellTxt.classList.remove('active-swell');
    }

    // Bounce audio visualizer bars when playing
    if (state.isPlaying) {
        el.audioBars.forEach(bar => {
            const h = Math.floor(Math.random() * 60) + 10;
            bar.style.height = `${h}%`;
            bar.classList.add('active-play');
        });
    } else {
        el.audioBars.forEach(bar => {
            bar.classList.remove('active-play');
        });
    }
}

function setFocalPoint(point) {
    state.focalPoint = point;
    if (point === 'eyes') {
        el.focalEyes.classList.add('active');
        el.focalDiary.classList.remove('active');
    } else {
        el.focalDiary.classList.add('active');
        el.focalEyes.classList.remove('active');
    }
    generatePythonCode();
}

function play() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    el.btnPlay.style.display = 'none';
    el.btnPause.style.display = 'inline-block';
    
    state.playbackInterval = setInterval(() => {
        state.currentFrame++;
        if (state.currentFrame > 200) {
            state.currentFrame = 0;
        }
        updateTimelineUI();
    }, 66); // ~15 FPS playback for preview
}

function pause() {
    if (!state.isPlaying) return;
    state.isPlaying = false;
    el.btnPlay.style.display = 'inline-block';
    el.btnPause.style.display = 'none';
    clearInterval(state.playbackInterval);
    updateTimelineUI();
}

// BIND CONTROLS
el.curtainSpeed.addEventListener('input', updateStateAndUI);
el.lightIntensity.addEventListener('input', updateStateAndUI);
el.sceneDesc.addEventListener('input', updateStateAndUI);
el.asciiDiagram.addEventListener('input', updateStateAndUI);
el.mathPlot.addEventListener('input', updateStateAndUI);
el.shelfPreset.addEventListener('change', updateStateAndUI);
el.noisePreset.addEventListener('change', updateStateAndUI);
el.smoothing.addEventListener('input', updateStateAndUI);

el.focalDiary.addEventListener('click', () => setFocalPoint('diary'));
el.focalEyes.addEventListener('click', () => setFocalPoint('eyes'));

el.btnPlay.addEventListener('click', play);
el.btnPause.addEventListener('click', pause);

el.timelineSlider.addEventListener('input', (event) => {
    pause();
    state.currentFrame = parseInt(event.target.value);
    updateTimelineUI();
});

// Markers jump timeline click
el.markers.forEach(marker => {
    marker.addEventListener('click', () => {
        pause();
        state.currentFrame = parseInt(marker.getAttribute('data-frame'));
        updateTimelineUI();
    });
});

// Copy Button
el.btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(el.codeBlock.textContent).then(() => {
        const originalText = el.btnCopy.textContent;
        el.btnCopy.textContent = "✓ CODE COPIED!";
        el.btnCopy.style.background = "rgba(16, 185, 129, 0.2)";
        el.btnCopy.style.color = "#10b981";
        setTimeout(() => {
            el.btnCopy.textContent = originalText;
            el.btnCopy.style.background = "rgba(253, 184, 19, 0.1)";
            el.btnCopy.style.color = "#fdb813";
        }, 2000);
    });
});

// PERSISTENCE & PROJECT MANAGERS
function saveProject() {
    const data = {
        sceneDesc: el.sceneDesc.value,
        asciiDiagram: el.asciiDiagram.value,
        mathPlot: el.mathPlot.value,
        notebookDiary: el.projectNotebookDiary.value
    };
    localStorage.setItem(`project_state_${state.activeProject}`, JSON.stringify(data));
}

function loadProject(projKey) {
    state.activeProject = projKey;
    el.projectSelector.value = projKey;
    
    const saved = localStorage.getItem(`project_state_${projKey}`);
    const defaultData = projectPresets[projKey] || { sceneDesc: "", asciiDiagram: "", mathPlot: "" };
    const data = saved ? JSON.parse(saved) : defaultData;
    
    el.sceneDesc.value = data.sceneDesc || "";
    el.asciiDiagram.value = data.asciiDiagram || "";
    el.mathPlot.value = data.mathPlot || "";
    el.projectNotebookDiary.value = data.notebookDiary || `Dear Diary,\nToday we are developing our visual pre-viz for the ${projKey} short film...\n`;
    
    updateStateAndUI();
}

el.projectSelector.addEventListener('change', (e) => {
    loadProject(e.target.value);
});

// Update updateStateAndUI to support auto-saving
const originalUpdateStateAndUI = updateStateAndUI;
updateStateAndUI = function() {
    originalUpdateStateAndUI();
    saveProject();
};

el.tab3d.addEventListener('click', () => {
    el.tab3d.style.background = 'rgba(16, 185, 129, 0.2)';
    el.tab3d.style.borderColor = '#10b981';
    el.tab3d.style.color = '#10b981';
    
    el.tabCycles.style.background = 'rgba(253, 184, 19, 0.05)';
    el.tabCycles.style.borderColor = 'rgba(253, 184, 19, 0.2)';
    el.tabCycles.style.color = '#888';
    
    el.viewport.style.backgroundImage = "url('blockout_view.png')";
    el.camLensStats.textContent = "3D VIEWPORT // WIREFRAME GRID // 35mm";
});

el.tabCycles.addEventListener('click', () => {
    el.tabCycles.style.background = 'rgba(253, 184, 19, 0.2)';
    el.tabCycles.style.borderColor = '#fdb813';
    el.tabCycles.style.color = '#fdb813';
    
    el.tab3d.style.background = 'rgba(16, 185, 129, 0.05)';
    el.tab3d.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    el.tab3d.style.color = '#888';
    
    el.viewport.style.backgroundImage = "url('rendered_view.png')";
    el.camLensStats.textContent = "CAM_01 // 55mm // f/1.8 // CYCLES RENDER";
});

// CREATIVE SUITE NAVIGATION TABS
const suiteTabs = [
    { btn: el.suiteTabStoryboard, content: el.suiteContentStoryboard },
    { btn: el.suiteTabWhiteboard, content: el.suiteContentWhiteboard },
    { btn: el.suiteTabAscii, content: el.suiteContentAscii },
    { btn: el.suiteTabLibrary, content: el.suiteContentLibrary },
    { btn: el.suiteTabDiary, content: el.suiteContentDiary }
];

suiteTabs.forEach(tab => {
    tab.btn.addEventListener('click', () => {
        suiteTabs.forEach(t => {
            t.btn.classList.remove('active');
            t.content.style.display = 'none';
        });
        tab.btn.classList.add('active');
        tab.content.style.display = 'flex';
        
        // Initialize whiteboard canvas background if shown
        if (tab.btn === el.suiteTabWhiteboard) {
            initWhiteboard();
        }
    });
});

// DRAWING WHITEBOARD CANVAS LOGIC
let isDrawing = false;
let drawMode = 'draw'; // 'draw' or 'erase'
const ctx = el.whiteboardCanvas.getContext('2d');

function initWhiteboard() {
    const imgData = ctx.getImageData(0, 0, el.whiteboardCanvas.width, el.whiteboardCanvas.height);
    let allTransparent = true;
    for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i+3] !== 0) {
            allTransparent = false;
            break;
        }
    }
    if (allTransparent) {
        ctx.fillStyle = '#03050b';
        ctx.fillRect(0, 0, el.whiteboardCanvas.width, el.whiteboardCanvas.height);
    }
}

el.whiteboardCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    ctx.beginPath();
    const rect = el.whiteboardCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (el.whiteboardCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (el.whiteboardCanvas.height / rect.height);
    ctx.moveTo(x, y);
});

el.whiteboardCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = el.whiteboardCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (el.whiteboardCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (el.whiteboardCanvas.height / rect.height);
    
    ctx.lineWidth = drawMode === 'draw' ? 3 : 24;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawMode === 'draw' ? '#10b981' : '#03050b';
    
    ctx.lineTo(x, y);
    ctx.stroke();
});

el.whiteboardCanvas.addEventListener('mouseup', () => { isDrawing = false; });
el.whiteboardCanvas.addEventListener('mouseleave', () => { isDrawing = false; });

el.whiteboardDrawBtn.addEventListener('click', () => {
    drawMode = 'draw';
    el.whiteboardDrawBtn.classList.add('active');
    el.whiteboardEraseBtn.classList.remove('active');
});

el.whiteboardEraseBtn.addEventListener('click', () => {
    drawMode = 'erase';
    el.whiteboardEraseBtn.classList.add('active');
    el.whiteboardDrawBtn.classList.remove('active');
});

el.whiteboardClearBtn.addEventListener('click', () => {
    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, el.whiteboardCanvas.width, el.whiteboardCanvas.height);
});

// SKETCH-TO-ASCII CONVERTER LOGIC
el.asciiUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    el.asciiFileName.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const maxW = 60;
            const maxH = 25;
            let w = img.width;
            let h = img.height;
            
            if (w > maxW) {
                h = Math.floor(h * (maxW / w));
                w = maxW;
            }
            if (h > maxH) {
                w = Math.floor(w * (maxH / h));
                h = maxH;
            }
            
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, w, h);
            
            const pixels = tempCtx.getImageData(0, 0, w, h);
            const chars = '@#S+*;:,. ';
            let asciiStr = '';
            
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const r = pixels.data[idx];
                    const g = pixels.data[idx+1];
                    const b = pixels.data[idx+2];
                    const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b);
                    const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
                    asciiStr += chars[charIdx];
                }
                asciiStr += '\n';
            }
            el.asciiOutputPre.textContent = asciiStr;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// LOCAL DISK BRIDGE CLIENT LAYER
let isBridgeConnected = false;

async function checkLocalBridge() {
    try {
        const res = await fetch('http://localhost:5000/api/projects');
        if (res.ok) {
            isBridgeConnected = true;
            el.localStatusDot.style.background = '#10b981';
            el.localStatusTxt.textContent = 'LOCAL DISK BRIDGE CONNECTED';
            el.btnRunBlender.style.background = 'rgba(16, 185, 129, 0.2)';
            el.btnRunBlender.style.borderColor = '#10b981';
            el.btnRunBlender.style.color = '#10b981';
            el.btnRunBlender.disabled = false;
        } else {
            throw new Error();
        }
    } catch (err) {
        isBridgeConnected = false;
        el.localStatusDot.style.background = '#ef4444';
        el.localStatusTxt.textContent = 'LOCAL DISK BRIDGE DISCONNECTED';
        el.btnRunBlender.style.background = 'rgba(239, 68, 68, 0.05)';
        el.btnRunBlender.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        el.btnRunBlender.style.color = '#888';
        el.btnRunBlender.disabled = true;
    }
}

async function saveToLocalDisk() {
    if (!isBridgeConnected) return;
    const data = {
        sceneDesc: el.sceneDesc.value,
        asciiDiagram: el.asciiDiagram.value,
        mathPlot: el.mathPlot.value,
        notebookDiary: el.projectNotebookDiary.value
    };
    try {
        await fetch('http://localhost:5000/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName: state.activeProject,
                state: data
            })
        });
    } catch (e) {
        console.error("Local disk save failed:", e);
    }
}

// Intercept saveProject to auto-sync to local disk
const originalSaveProject = saveProject;
saveProject = function() {
    originalSaveProject();
    saveToLocalDisk();
};

el.btnRunBlender.addEventListener('click', async () => {
    if (!isBridgeConnected) return;
    
    el.btnRunBlender.textContent = '⏳ RENDERING ON LOCAL GPU...';
    el.btnRunBlender.style.background = 'rgba(253, 184, 19, 0.2)';
    el.btnRunBlender.style.borderColor = '#fdb813';
    el.btnRunBlender.style.color = '#fdb813';
    
    try {
        const res = await fetch('http://localhost:5000/api/render', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            el.btnRunBlender.textContent = '✅ RENDER COMPLETED!';
            el.btnRunBlender.style.background = 'rgba(16, 185, 129, 0.2)';
            el.btnRunBlender.style.borderColor = '#10b981';
            el.btnRunBlender.style.color = '#10b981';
            
            // Log terminal output to user's scripting bridge box for high interactivity!
            el.codeBlock.textContent = data.stdout || "Scene compiled successfully inside Blender!";
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        el.btnRunBlender.textContent = '❌ RENDER FAILED';
        el.btnRunBlender.style.background = 'rgba(239, 68, 68, 0.2)';
        el.btnRunBlender.style.borderColor = '#ef4444';
        el.btnRunBlender.style.color = '#ef4444';
    }
    
    setTimeout(() => {
        el.btnRunBlender.textContent = '🚀 RUN BLENDER JOB (LOCAL GPU)';
        checkLocalBridge();
    }, 4000);
});
// INTERACTIVE SCENE CONSTRUCTOR STATE & LOGIC
let activeObjects = [
    { name: "WritingDesk_Oak", type: "cube", x: 0.0, y: 2.0, z: 0.0, sx: 1.2, sy: 0.8, sz: 0.75, mat: "Rustic_Wood" },
    { name: "Character_Girl", type: "cylinder", x: 0.0, y: 2.0, z: 0.8, sx: 0.25, sy: 0.25, sz: 1.4, mat: "Emerald_Glow" }
];

function renderObjectsList() {
    el.constructorObjectsList.innerHTML = "";
    
    activeObjects.forEach((obj, idx) => {
        const card = document.createElement('div');
        card.style.background = 'rgba(5, 8, 17, 0.6)';
        card.style.padding = '8px 12px';
        card.style.borderRadius = '6px';
        card.style.border = '1px solid rgba(255,255,255,0.05)';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.gap = '10px';
        
        const info = document.createElement('div');
        info.innerHTML = `
            <div style="font-weight: bold; font-size: 11px; color: #fdb813;">${obj.name} (${obj.type.toUpperCase()})</div>
            <div style="font-size: 9px; color: #888;">Pos: (${obj.x}, ${obj.y}, ${obj.z}) | Scale: (${obj.sx}, ${obj.sy}, ${obj.sz})</div>
            <div style="font-size: 9px; color: #10b981;">Mat: ${obj.mat.replace('_', ' ')}</div>
        `;
        
        const delBtn = document.createElement('button');
        delBtn.textContent = "❌";
        delBtn.style.background = "none";
        delBtn.style.border = "none";
        delBtn.style.cursor = "pointer";
        delBtn.style.fontSize = "10px";
        delBtn.addEventListener('click', () => {
            activeObjects.splice(idx, 1);
            renderObjectsList();
            updateStateAndUI();
        });
        
        card.appendChild(info);
        card.appendChild(delBtn);
        el.constructorObjectsList.appendChild(card);
    });
}

el.btnConstructorAdd.addEventListener('click', () => {
    const name = el.constructorName.value.trim() || "CustomMesh";
    const type = el.constructorType.value;
    const x = parseFloat(el.constructorX.value) || 0.0;
    const y = parseFloat(el.constructorY.value) || 0.0;
    const z = parseFloat(el.constructorZ.value) || 0.0;
    const sx = parseFloat(el.constructorScaleX.value) || 1.0;
    const sy = parseFloat(el.constructorScaleY.value) || 1.0;
    const sz = parseFloat(el.constructorScaleZ.value) || 1.0;
    const mat = el.constructorMaterial.value;
    
    // Avoid duplicates
    if (activeObjects.some(obj => obj.name === name)) {
        alert("An object with this name already exists!");
        return;
    }
    
    activeObjects.push({ name, type, x, y, z, sx, sy, sz, mat });
    renderObjectsList();
    updateStateAndUI();
});

el.btnConstructorDelete.addEventListener('click', () => {
    const name = el.constructorName.value.trim();
    const idx = activeObjects.findIndex(obj => obj.name === name);
    if (idx !== -1) {
        activeObjects.splice(idx, 1);
        renderObjectsList();
        updateStateAndUI();
    } else {
        alert("Object not found!");
    }
});

// Invoke initial render
renderObjectsList();

// Periodic ping check
setInterval(checkLocalBridge, 5000);
checkLocalBridge();

// INITIALIZATION
loadProject('the_room_breathes');
updateTimelineUI();
el.btnPause.style.display = 'none';
