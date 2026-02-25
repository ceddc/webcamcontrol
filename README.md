# webcamcontrol

Experience Builder custom widget for webcam-driven hand-gesture map control.

## Local Layout

- Canonical repo: `/home/ced/dev/projects/expb/webcamcontrol`
- Deployed copy for ExB runtime: `/home/ced/dev/projects/expb/expb119/client/your-extensions/webcamcontrol`

## Deploy to Extension Folder

Run this from the repo root to copy current widget sources into the Experience Builder extension folder:

```bash
bash scripts/deploy-to-expb.sh
```

## References

- ArcGIS Experience Builder SDK Samples: https://github.com/Esri/arcgis-experience-builder-sdk-resources
- Official ArcGIS Experience Builder page: https://www.esri.com/en-us/arcgis/products/arcgis-experience-builder/overview

## Prompt History

1. Can you read 5 widget sampleem and write yourself a doc in the root on how to create a working experience builder widget ?

2. Based on your knowhow in EXPERIENCE_BUILDER_WIDGET_GUIDE.md I need you to write a new experience builder widget with the code name webcamcontrol . Please make a new git repo + private github. The widget must show in a panel my current webcam feed, and use the https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker mediapipe to do live analysis of hands in the webcam. I need when I show 1 index finger to use the movement to pan on the map with high sensitivity. I need when I show 2 index finger to make like a zoom in/zoom out function depending on the finger distance. Be as fluid as possible it must work like a touchscreen . Please show visualy on the webcam feed the hands mediapipe graphic with large visuals. Please make an config option to show change like the color of the finger graphic. Please make the widget able to select the connected map in the config, with a default 600*400px and resizable. Deploy the widget then in projects\expb\expb119\client\your-extensions\webcamcontrol
