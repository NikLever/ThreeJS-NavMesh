import Recast from "./recast.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, MeshBasicMaterial, Mesh } from 'three';

class RecastHelper{
  constructor(recastWasm = '../recast/recast.wasm'){

    this.defaultParams = {
      cellSize: 0.166,
      cellHeight: 0.1,
      agentHeight: 1.7,
      agentRadius: 0.5,
      agentMaxClimb: 0.3,
      agentMaxSlope: 45,
      regionMinSize: 1,
      regionMergeSize: 20,
      edgeMaxLen: 12,
      edgeMaxError: 1,
      vertsPerPoly: 3,
      detailSampleDist: 16,
      detailSampleMaxError: 1
    };

    this.recast = Recast({
      locateFile(path) {
        if (path.endsWith(".wasm")) {
          return recastWasm;
        }
      }
    });
  }

  mergeMeshGeometries(meshes, cullBackFace=true) {
    const geometries = [];
  
    for (const mesh of meshes) {
      let geometry = mesh.geometry;
      let attributes = geometry.attributes;
  
      if (!geometry.isBufferGeometry) {
        geometry = new BufferGeometry().fromGeometry(geometry);
        attributes = geometry.attributes;
      }
  
      if (!attributes.position || attributes.position.itemSize !== 3) return;
  
      if (geometry.index) geometry = geometry.toNonIndexed();
  
      const cloneGeometry = new BufferGeometry();
      cloneGeometry.setAttribute("position", geometry.attributes.position.clone());
      mesh.updateMatrixWorld();
      cloneGeometry.applyMatrix4(mesh.matrixWorld);
      geometry = cloneGeometry;
  
      geometries.push(geometry);
    }
  
    if (geometries.length === 0) {
      return new BufferGeometry();
    }
  
    const geometry = BufferGeometryUtils.mergeGeometries(geometries);
  
    if (cullBackFace) return geometry;

    //If double sided geometry is required
    const flippedGeometry = geometry.clone();
  
    const positions = flippedGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 9) {
      const x0 = positions[i];
      const y0 = positions[i + 1];
      const z0 = positions[i + 2];
      const offset = 6;
      positions[i] = positions[i + offset];
      positions[i + 1] = positions[i + offset + 1];
      positions[i + 2] = positions[i + offset + 2];
      positions[i + offset] = x0;
      positions[i + offset + 1] = y0;
      positions[i + offset + 2] = z0;
    }
  
    return BufferGeometryUtils.mergeGeometries([geometry, flippedGeometry]);
  }
  /**
     * Creates a navigation mesh
     * @param obj ThreeJS object3d traversed to provide the geometry to compute the navigation mesh
     * @param params bunch of parameters used to filter geometry
     */
  
  async createNavMesh(obj, parameters){
    try {
      await (Recast).call({})
      //await this.recast.ready;

      const meshArray = [];

      obj.traverse(object => {
        if (object.isMesh) {
          meshArray.push(object);
        }
      });
      
      const mergedGeometry = this.mergeMeshGeometries(meshArray);
      
      const verts = mergedGeometry.attributes.position.array;
      const faces = new Int32Array(verts.length);
      
      for (let i = 0; i < faces.length; i++) {
        faces[i] = i;
      }

      this.navMesh = new this.recast.NavMesh();
      
      // blocking calls
      const rc = new this.recast.rcConfig();
      rc.cs = parameters.cs;
      rc.ch = parameters.ch;
      rc.borderSize = parameters.borderSize ? parameters.borderSize : 0;
      rc.tileSize = parameters.tileSize ? parameters.tileSize : 0;
      rc.walkableSlopeAngle = parameters.walkableSlopeAngle;
      rc.walkableHeight = parameters.walkableHeight;
      rc.walkableClimb = parameters.walkableClimb;
      rc.walkableRadius = parameters.walkableRadius;
      rc.maxEdgeLen = parameters.maxEdgeLen;
      rc.maxSimplificationError = parameters.maxSimplificationError;
      rc.minRegionArea = parameters.minRegionArea;
      rc.mergeRegionArea = parameters.mergeRegionArea;
      rc.maxVertsPerPoly = parameters.maxVertsPerPoly;
      rc.detailSampleDist = parameters.detailSampleDist;
      rc.detailSampleMaxError = parameters.detailSampleMaxError;
      const result = this.navMesh.build(verts, verts.length/3, faces, faces.length, rc);
    }catch(err){
      console.error(err);
      return null;
    }
  }

  async createNavMeshX(obj, params){
    
    try {
      await this.recast.ready;

      const meshArray = [];

      obj.traverse(object => {
        if (object.isMesh) {
          meshArray.push(object);
        }
      });
      
      const mergedGeometry = this.mergeMeshGeometries(meshArray);
      
      const verts = mergedGeometry.attributes.position.array;
      const faces = new Int32Array(verts.length / 3);
      
      for (let i = 0; i < faces.length; i++) {
        faces[i] = i;
      }

      if (!this.recast.loadArray(verts, faces)) {
        console.error("error loading navmesh data" );
        return null;
      }

      const {
        cellSize,
        cellHeight,
        agentHeight,
        agentRadius,
        agentMaxClimb,
        agentMaxSlope,
        regionMinSize,
        regionMergeSize,
        edgeMaxLen,
        edgeMaxError,
        vertsPerPoly,
        detailSampleDist,
        detailSampleMaxError
      } = Object.assign({}, this.defaultParams, params || {});

      const status = this.recast.build(
        cellSize,
        cellHeight,
        agentHeight,
        agentRadius,
        agentMaxClimb,
        agentMaxSlope,
        regionMinSize,
        regionMergeSize,
        edgeMaxLen,
        edgeMaxError,
        vertsPerPoly,
        detailSampleDist,
        detailSampleMaxError
      );

      if (status !== 0) {
        console.error("unknown error building nav mesh", status );
        return null;
      }

      const meshes = this.recast.getMeshes();
      const wasmVerts = this.recast.getVerts();
      const vertsDst = new Float32Array(wasmVerts.length);
      vertsDst.set(wasmVerts);
      const tris = this.recast.getTris();

      const indices = new Uint16Array((tris.length / 4) * 3);
      let index = 0;

      const numMeshes = meshes.length / 4;

      for (let i = 0; i < numMeshes; i++) {
        const meshOffset = i * 4;
        const meshVertsOffset = meshes[meshOffset];
        const meshTrisOffset = meshes[meshOffset + 2];
        const meshNumTris = meshes[meshOffset + 3];

        for (let j = 0; j < meshNumTris; j++) {
          const triangleOffset = (meshTrisOffset + j) * 4;
          
          const a = meshVertsOffset + tris[triangleOffset];
          const b = meshVertsOffset + tris[triangleOffset + 1];
          const c = meshVertsOffset + tris[triangleOffset + 2];

          indices[index++] = a;
          indices[index++] = b;
          indices[index++] = c;
        }
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(vertsDst, 3));
      geometry.setIndex(new Uint16BufferAttribute(indices, 1));

      const material = new MeshBasicMaterial({ color: 0x0000ff, wireframe: true });

      const mesh = new Mesh(geometry, material);
      mesh.position.y -= cellHeight;

      this.recast.freeNavMesh();

      return mesh;

      } catch (err) {
        console.error(err);
        return null;
      }
    }
  }

  export { RecastHelper }
