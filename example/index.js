import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RecastHelper  } from "../recast/RecastHelper.js";

const canvas = document.getElementById("canvas");

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();

scene.add(new THREE.AmbientLight(0x404040));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 10, 0);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.right = 150;
directionalLight.shadow.camera.left = -150;
directionalLight.shadow.camera.top	= 150;
directionalLight.shadow.camera.bottom = -150;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
scene.add(directionalLightHelper);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);
camera.lookAt(0, 0, 0);
scene.add(camera);

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10, 10),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.01
  })
);
plane.castShadow = true;
plane.receiveShadow = true;
plane.rotation.set(-Math.PI / 2, 0, 0);
scene.add(plane);

const cube1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.1, 2, 1, 1, 1),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.01
  })
);
cube1.castShadow = true;
cube1.receiveShadow = true;
cube1.position.set(-2, 0.5, 1.2);
cube1.rotation.set(Math.PI / 5, 0, 0);
scene.add(cube1);

const cube2 = new THREE.Mesh(
  new THREE.BoxGeometry(5, 0.1, 5),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.01
  })
);
cube2.castShadow = true;
cube2.receiveShadow = true;
cube2.position.set(-2, 1, -2);
scene.add(cube2);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.01
  })
);
sphere.castShadow = true;
sphere.receiveShadow = true;
sphere.position.set(2, 0, 2);
scene.add(sphere);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

function render() {
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);

const helper = new RecastHelper();
helper.createNavMesh(scene, {
  cellSize: 0.03,
  regionMinSize: 0.5,
  agentRadius: 0.3,
  agentHeight: 1.5
}).then( (mesh) => { if (mesh){
  scene.add( mesh );
}
});



