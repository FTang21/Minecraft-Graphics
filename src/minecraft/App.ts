import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { GUI } from "./Gui.js";
import {

  blankCubeFSText,
  blankCubeVSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { Cube } from "./Cube.js";
import { Chunk } from "./Chunk.js";

export class MinecraftAnimation extends CanvasAnimation {
  private gui: GUI;
  
  private chunks : Chunk[];
  private outsideChunks: Chunk[];
  private distantChunks: Chunk[];
  private currChunkCenter : number[];
  private velocity: number;
  private time: number;
  private lightSpeed: number[];
  private theta: number;
  private LRUCache: Object;
  private LRUQueue: string[];
  
  /*  Cube Rendering */
  private cubeGeometry: Cube;
  private blankCubeRenderPass: RenderPass;
  private distantCube: Cube;
  private distantCubeRenderPass: RenderPass;

  /* Global Rendering Info */
  private lightPosition: Vec4;
  private backgroundColor: Vec4;

  private canvas2d: HTMLCanvasElement;
  
  // Player's head position in world coordinate.
  // Player should extend two units down from this location, and 0.4 units radially.
  private playerPosition: Vec3;
  
  
  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;
  
    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;
        
    this.gui = new GUI(this.canvas2d, this);
    this.playerPosition = this.gui.getCamera().pos();
    
    // Generate initial landscape
    this.LRUCache = {};
    this.LRUQueue = [];
    this.generateChunks(0.0, 0.0);
    this.currChunkCenter = [0.0, 0.0];
    this.velocity = 0;
    this.time = Date.now();
    this.lightSpeed = [0.001, 0.01, 0.1];
    this.theta = 0;
    this.distantCube = new Cube(1.0);
    this.distantCubeRenderPass = new RenderPass(gl, blankCubeVSText, blankCubeFSText);

    this.blankCubeRenderPass = new RenderPass(gl, blankCubeVSText, blankCubeFSText);
    this.cubeGeometry = new Cube(0.5);
    this.initBlankCube();
    
    this.lightPosition = new Vec4([-1000, 1000, -1000, 1]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);    
  }

  /**
   * Setup the simulation. This can be called again to reset the program.
   */
  public reset(): void {    
      this.gui.reset();
      
      this.generateChunks(0.0, 0.0);
      this.currChunkCenter = [0.0, 0.0];
      this.velocity = 0;
      this.time = Date.now();
      this.playerPosition = this.gui.getCamera().pos();
      
  }

  private generateChunks(centerChunkX: number, centerChunkY: number) {
    this.chunks = new Array();
    this.outsideChunks = new Array();
    this.distantChunks = new Array();
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        let x = i * 64.0 + centerChunkX;
        let y = j * 64.0 + centerChunkY;
        if (Math.abs(i) > 2 || Math.abs(j) > 2) {
          this.distantChunks.push(new Chunk(x, y, 32));
        } else if (Math.abs(i) == 2 || Math.abs(j) == 2) {
          let key = x + ", " + y;
          if (key in this.LRUCache) {
            this.outsideChunks.push(this.LRUCache[key]);
          } else {
            let chunk = new Chunk(x, y, 64);
            this.outsideChunks.push(chunk)
            this.LRUCache[key] = chunk;
            this.LRUQueue.push(key);
          }
        }
          else {
          let key = x + ", " + y;
          if (key in this.LRUCache) {
            this.chunks.push(this.LRUCache[key]);
          } else {
            let chunk = new Chunk(x, y, 64);
            this.chunks.push(chunk)
            this.LRUCache[key] = chunk;
            this.LRUQueue.push(key);
          }
        }
      }
    }
    while (this.LRUQueue.length > 21) {
      let pop = this.LRUQueue.shift();
      if (pop) {
        delete this.LRUCache[pop];
      }
    }
  }
  
  /**
   * Sets up the blank cube drawing
   */
  private initBlankCube(): void {
    this.blankCubeRenderPass.setIndexBufferData(this.cubeGeometry.indicesFlat());
    this.blankCubeRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.positionsFlat()
    );

    this.blankCubeRenderPass.addAttribute("bVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.positionsFlat()
    );
    
    this.blankCubeRenderPass.addAttribute("aNorm",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.normalsFlat()
    );
    
    this.blankCubeRenderPass.addAttribute("aUV",
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cubeGeometry.uvFlat()
    );
    
    this.blankCubeRenderPass.addInstancedAttribute("aOffset",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.blankCubeRenderPass.addInstancedAttribute("cubeType",
      1,
      this.ctx.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.blankCubeRenderPass.addInstancedAttribute("pSeed",
      1,
      this.ctx.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.blankCubeRenderPass.addInstancedAttribute("horizon",
      1,
      this.ctx.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.blankCubeRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.blankCubeRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.blankCubeRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });
    
    this.blankCubeRenderPass.setDrawData(this.ctx.TRIANGLES, this.cubeGeometry.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.blankCubeRenderPass.setup();   
    
    this.distantCubeRenderPass.setDrawData(this.ctx.TRIANGLES, this.distantCube.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.distantCubeRenderPass.setup();    

    this.distantCubeRenderPass.setIndexBufferData(this.distantCube.indicesFlat());
    this.distantCubeRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.distantCube.positionsFlat()
    );
    
    this.distantCubeRenderPass.addAttribute("aNorm",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.distantCube.normalsFlat()
    );
    
    this.distantCubeRenderPass.addAttribute("aUV",
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.distantCube.uvFlat()
    );
    
    this.distantCubeRenderPass.addInstancedAttribute("aOffset",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.distantCubeRenderPass.addInstancedAttribute("cubeType",
      1,
      this.ctx.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.distantCubeRenderPass.addInstancedAttribute("pSeed",
      1,
      this.ctx.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      new Float32Array(0)
    );

    this.distantCubeRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.distantCubeRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.distantCubeRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });
    
    this.distantCubeRenderPass.setDrawData(this.ctx.TRIANGLES, this.distantCube.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.distantCubeRenderPass.setup();    
  }



  /**
   * Draws a single frame
   *
   */
  public draw(): void {
    //TODO: Logic for a rudimentary walking simulator. Check for collisions and reject attempts to walk into a cube. Handle gravity, jumping, and loading of new chunks when necessary.
  
    let chunk = this.chunks[4];    
    this.playerPosition.add(this.gui.walkDir());
    let xLess = this.playerPosition.x - this.currChunkCenter[0] < -32;
    let xMore = this.playerPosition.x - this.currChunkCenter[0] >= 32;
    let zLess = this.playerPosition.z - this.currChunkCenter[1] < -32;
    let zMore = this.playerPosition.z - this.currChunkCenter[1] >= 32;

    if (xLess && zLess) {
      chunk = this.chunks[0];
    } else if (xLess && zMore) {
      chunk = this.chunks[2];
    } else if (xMore && zLess) {
      chunk = this.chunks[6];
    } else if (xMore && zMore) {
      chunk = this.chunks[8];
    } else if (xLess) {
      chunk = this.chunks[1];
    } else if (xMore) {
      chunk = this.chunks[7];
    } else if (zLess) {
      chunk = this.chunks[3];
    } else if (zMore) {
      chunk = this.chunks[5];
    } 

    if (chunk.checkCollision(this.playerPosition, this.gui.walkDir())) {
      this.playerPosition.subtract(this.gui.walkDir());
    }

    let dt = (Date.now() - this.time) / 10000;
    this.velocity += 9.8 * dt;
    if (chunk.checkGround(this.playerPosition) && this.velocity >= 0) {
      this.velocity = 0;
    } else {
      this.playerPosition.subtract(new Vec3([0, this.velocity, 0]));
    }

    this.time = Date.now();

    // Drawing
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
    this.drawScene(0, 0, 1280, 960);        
  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);

    //TODO: Render multiple chunks around the player, using Perlin noise shaders

    this.gui.getCamera().setPos(this.playerPosition);

    let prevX = this.currChunkCenter[0];
    let prevY = this.currChunkCenter[1];

    if(this.playerPosition.x < prevX - 32.0) {
      this.currChunkCenter[0] -= 64.0;
    }
    if(this.playerPosition.x > prevX + 32.0) {
      this.currChunkCenter[0] += 64.0;
    }
    if(this.playerPosition.z < prevY - 32.0) {
      this.currChunkCenter[1] -= 64.0;
    }
    if(this.playerPosition.z > prevY + 32.0) {
      this.currChunkCenter[1] += 64.0;
    }

    if (prevX != this.currChunkCenter[0] || prevY != this.currChunkCenter[1]) {
      this.generateChunks(this.currChunkCenter[0], this.currChunkCenter[1]);
    }

    let diffTime = (Date.now() - this.time) * this.lightSpeed[0];
    this.theta = this.theta + diffTime;
    let lightY = 1000 * Math.cos(this.theta);
    let lightZ = -1000 * Math.cos(this.theta);
    let newLightPos = new Vec4([this.lightPosition.x, lightY, lightZ, 1.0]);
    this.blankCubeRenderPass.updateUniform("uLightPos", newLightPos);
    this.distantCubeRenderPass.updateUniform("uLightPos", newLightPos);

    for (let i = 0; i < this.chunks.length; i++) {
      this.blankCubeRenderPass.updateAttributeBuffer("aOffset", this.chunks[i].cubePositions());
      this.blankCubeRenderPass.updateAttributeBuffer("cubeType", this.chunks[i].getCubeTypes());
      this.blankCubeRenderPass.updateAttributeBuffer("pSeed", this.chunks[i].getSeeds());
      this.blankCubeRenderPass.drawInstanced(this.chunks[i].numCubes());   
    }

    for (let i = 0; i < this.outsideChunks.length; i++) {
      this.blankCubeRenderPass.updateAttributeBuffer("aOffset", this.outsideChunks[i].cubePositions());
      this.blankCubeRenderPass.updateAttributeBuffer("cubeType", this.outsideChunks[i].getCubeTypes());
      this.blankCubeRenderPass.updateAttributeBuffer("pSeed", this.outsideChunks[i].getSeeds());
      this.blankCubeRenderPass.drawInstanced(this.outsideChunks[i].numCubes());  
    }

    for (let i = 0; i < this.distantChunks.length; i++) {
      this.distantCubeRenderPass.updateAttributeBuffer("aOffset", this.distantChunks[i].cubePositions());
      this.distantCubeRenderPass.updateAttributeBuffer("cubeType", this.distantChunks[i].getCubeTypes());
      this.distantCubeRenderPass.updateAttributeBuffer("pSeed", this.distantChunks[i].getSeeds());
      this.distantCubeRenderPass.drawInstanced(this.distantChunks[i].numCubes());  
    }
  }

  public getGUI(): GUI {
    return this.gui;
  }
  
  public jump() {
      //TODO: If the player is not already in the air, launch them upwards at 10 units/sec.
    if (this.chunks[4].checkGround(this.playerPosition)) {
      this.velocity = -0.75;
    }
  }

  public speedTime() {
    let next = this.lightSpeed.shift();
    if (next) {
      this.lightSpeed.push(next);
    }
  }

  public destroy(ray: Vec3, origin: Vec3) {
    this.chunks[4].destroyBlock(ray, origin);
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: MinecraftAnimation = new MinecraftAnimation(canvas);
  canvasAnimation.start();  
}
