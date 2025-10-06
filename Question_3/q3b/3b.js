/**
 * WebXR ar demo using hit-test, anchors, and depth sensing
 * 
 * Every press on the screen will add a figure in the requested position (if the ring is displayed). Those meshes will be kept in place by the AR system you are using.
 * 
 * Working on android devices and the latest chrome browser, or the oculus quest 3.
 * 
 * Created by Raanan Weber (@RaananW)
 */

var createScene = async function () {

    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 1, -5), scene);

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // AR availability check and GUI in non-AR mode
    const arAvailable = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');

    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "FullscreenUI"
    );

    const rectangle = new BABYLON.GUI.Rectangle("rect");
    rectangle.background = "black";
    rectangle.color = "blue";
    rectangle.width = "80%";
    rectangle.height = "50%";

    advancedTexture.addControl(rectangle);
    const nonXRPanel = new BABYLON.GUI.StackPanel();
    rectangle.addControl(nonXRPanel);

    const text1 = new BABYLON.GUI.TextBlock("text1");
    text1.fontFamily = "Helvetica";
    text1.textWrapping = true;
    text1.color = "white";
    text1.fontSize = "14px";
    text1.height = "400px"
    text1.paddingLeft = "10px";
    text1.paddingRight = "10px";
 
    if (!arAvailable) {
        text1.text = "AR is not available in your system. Please make sure you use a supported device such as a Meta Quest 3 or a modern Android device and a supported browser like Chrome.\n \n Make sure you have Google AR services installed and that you enabled the WebXR incubation flag under chrome://flags";
        nonXRPanel.addControl(text1);
        return scene;
    } else {
        text1.text = "WebXR Demo: Hit test and depth sensing.\n \n Please enter AR with the button on the lower right corner to start. Once in AR, look at the floor for a few seconds (and move a little): the hit-testing ring will appear. Then click anywhere on the screen to place a model in your space.";
        nonXRPanel.addControl(text1);
    }

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    var dirLight = new BABYLON.DirectionalLight('light', new BABYLON.Vector3(0, -1, -0.5), scene);
    dirLight.position = new BABYLON.Vector3(0, 5, -5);

    var shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    const model = await BABYLON.ImportMeshAsync("https://raw.githubusercontent.com/xuanquanchen/ychen735_ar_2025_assignment3/main/Question_3/football.glb", scene);
    const soccer = model.meshes[0];
    soccer.rotationQuaternion = new BABYLON.Quaternion();
    soccer.isVisible = false;
    soccer.scaling = new BABYLON.Vector3(0.005, 0.005, 0.005);
    
    shadowGenerator.addShadowCaster(soccer, true);

    const hl = new BABYLON.HighlightLayer("hl1", scene);


    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: 'immersive-ar'
        },
        optionalFeatures: true
    });

    //Hide GUI in AR mode
    xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
        rectangle.isVisible = false;
    })
    xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        rectangle.isVisible = true;

    })

    // Enable the depth sensing module to hide the added models behind real-world objects
    xr.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.DEPTH_SENSING,
        "latest",
        {
            dataFormatPreference: ["ushort", "float"],
            usagePreference: ["cpu", "gpu"],
        },
    );

    const fm = xr.baseExperience.featuresManager;

    fm.enableFeature(BABYLON.WebXRBackgroundRemover.Name);

    const marker = BABYLON.MeshBuilder.CreateTorus('marker', { diameter: 0.15, thickness: 0.05 });
    marker.isVisible = false;
    marker.rotationQuaternion = new BABYLON.Quaternion();

    let hitTestSource = null;
    let currentResult = null;
    let BallList = [];
    let selectedModel = null;

    xr.input.onControllerAddedObservable.add(async (controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
            if (motionController.handedness === 'right') {
                //get componets
                const rightControllerIDs = motionController.getComponentIds();

                //get webxr session and reference space
                const session = xr.baseExperience.sessionManager.session;
                const referenceSpace = xr.baseExperience.sessionManager.referenceSpace;
                
                session.requestHitTestSource({
                    space: controller.inputSource.targetRaySpace
                }).then((source) => {
                    hitTestSource = source;
                });

                xr.baseExperience.sessionManager.onXRFrameObservable.add((xrFrame) => {
                    if (hitTestSource) {
                        const results = xrFrame.getHitTestResults(hitTestSource);

                        const result = results[0] || null;
                        currentResult = result;

                        if (results.length) {
                            marker.isVisible = true;
                            const pose = result.getPose(referenceSpace);
                            const p = pose.transform.position;
                            const q = pose.transform.orientation;

                            marker.position.set(p.x, p.y, -p.z);
                            marker.rotationQuaternion.set(q.x, q.y, q.z, q.w);
                        } else {
                            marker.isVisible = false;
                        }
                    }
                });

                // Right trigger for spawning models
                const rightTrigger = motionController.getComponent("xr-standard-trigger");
                if (rightTrigger) {
                    rightTrigger.onButtonStateChangedObservable.add(() => {
                        if (rightTrigger.pressed) {
                            if (currentResult == null || marker.isVisible == false || xr.baseExperience.sessionManager.inXRSession == false) {
                                return;
                            }

                            const pose = currentResult.getPose(referenceSpace);

                            if (pose) {
                                const newBall = soccer.clone("soccer");
                                newBall.isVisible = true;
                                const p = pose.transform.position;
                                const q = pose.transform.orientation;
                                const bbox = newBall.getBoundingInfo().boundingBox;
                                const heightOffset = (bbox.maximum.y - bbox.minimum.y) * newBall.scaling.y;

                                newBall.position.set(p.x, p.y + heightOffset * 0.5 + 0.01, -p.z);
                                newBall.rotationQuaternion.set(q.x, q.y, q.z, q.w);
                                

                                shadowGenerator.addShadowCaster(newBall, true);
                                BallList.push(newBall);
                                selectedModel = newBall;
                            }
                        }
                    });
                }
            }
        });
    });

    xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        if (hitTestSource) {
            hitTestSource.cancel();
            hitTestSource = null;
        }

        if (selectedModel) {
            hl.removeMesh(selectedModel);
            selectedModel = null;
        }
    });

                    
    return scene;

};