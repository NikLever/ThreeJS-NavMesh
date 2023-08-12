# ThreeJS - Navigation Mesh
![Screenshot](example/images/screenshot.png)
Use RecastHelper to create a navigation mesh from ThreeJS geometry

1. Add the threeJS library as folder three
1. If you use npm install --save three, then change the importmap paths in example/index.html
1. Import RecastHelper
1. Create a new instance of RecastHelper
1. Pass the scene or a Group and Params (optional) to the createNavMesh method of the helper
1. createNavMesh is an async promise. Add a then. It will receive the created mesh. 

See the example for usage

