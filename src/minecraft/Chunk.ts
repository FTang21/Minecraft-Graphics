import { Mat3, Mat4, Vec2, Vec3, Vec4 } from "../lib/TSM.js";
import Rand from "../lib/rand-seed/Rand.js"

export class Chunk {
    private cubes: number; // Number of cubes that should be *drawn* each frame
    private cubePositionsF32: Float32Array; // (4 x cubes) array of cube translations, in homogeneous coordinates
    private x : number; // Center of the chunk
    private y : number;
    private size: number; // Number of cubes along each side of the chunk
    private heights: number[][];
    private cubeTypes: Float32Array;
    private perlinSeeds: Float32Array;
    
    constructor(centerX : number, centerY : number, size: number) {
        this.x = centerX;
        this.y = centerY;
        this.size = size;
        this.cubes = size*size;  
        this.generateCubes();
    }
    
    
    private generateCubes() {
        const topleftx = this.x - 64 / 2;
        const toplefty = this.y - 64 / 2;
        //TODO: The real landscape-generation logic. The example code below shows you how to use the pseudorandom number generator to create a few cubes.

        let heightVal = 200.0;
        let octave2: number[][] = this.upsampleHelper(this.getExpandedMatrix(2, heightVal), 2);
        let octave4: number[][] = this.upsampleHelper(this.getExpandedMatrix(4, heightVal), 4);
        let octave8: number[][] = this.upsampleHelper(this.getExpandedMatrix(8, heightVal), 8);
        let octave16: number[][] = this.upsampleHelper(this.getExpandedMatrix(16, heightVal), 16);

        let texture1: number[][] = this.upsampleHelper(this.getExpandedMatrix(2, 3.0), 2);
        let texture2: number[][] = this.upsampleHelper(this.getExpandedMatrix(4, 3.0), 2);
        let texture3: number[][] = this.upsampleHelper(this.getExpandedMatrix(8, 3.0), 2);

        let heights = new Array(octave2.length); 
        this.heights = new Array(64);
        let types = new Array(64);
        let total: number = 4 * this.cubes;
        for (let i = 0; i < octave2.length; i++) {
            heights[i] = new Array(octave2.length);
            if (i > 0 && i < octave2.length - 1) {
                this.heights[i-1] = new Array(64);
                types[i-1] = new Array(64);
            }
            for (let j = 0; j < octave2.length; j++) {
                let height = Math.floor(octave2[i][j] / 2 + octave4[i][j] / 4 + 
                                        octave8[i][j] / 8 + octave16[i][j] / 16);
                if (i > 0 && j > 0 && i < octave2.length - 1 && j < octave2.length - 1) {
                    types[i-1][j-1] = (texture1[i][j] + texture2[i][j] + texture3[i][j]) / 3.0;
                    this.heights[i-1][j-1] = height;
                }
                heights[i][j] = height;
            }
        }

        let extendedHeights = new Array(64);
        for (let i = 1; i < heights.length - 1; i++) {
            extendedHeights[i-1] = new Array(64);
            for (let j = 1; j < heights.length - 1; j++) {
                let largest = 0;
                extendedHeights[i-1][j-1] = 0;
                if(heights[i][j] > heights[i-1][j] + 1) {
                    let temp = heights[i][j] - heights[i-1][j] + 1;
                    if (temp > largest) {
                        largest = temp;
                        extendedHeights[i-1][j-1] = largest;
                    }
                }
                if(heights[i][j] > heights[i][j-1] + 1) {
                    let temp = heights[i][j] - heights[i][j-1] + 1;
                    if (temp > largest) {
                        largest = temp;
                        extendedHeights[i-1][j-1] = largest;
                    }
                }
                if(heights.length - 1 && heights[i][j] > heights[i+1][j] + 1) {
                    let temp = heights[i][j] - heights[i+1][j] + 1;
                    if (temp > largest) {
                        largest = temp;
                        extendedHeights[i-1][j-1] = largest;
                    }
                }
                if(heights[i].length - 1 && heights[i][j] > heights[i][j+1] + 1) {
                    let temp = heights[i][j] - heights[i][j+1] + 1;
                    if (temp > largest) {
                        largest = temp;
                        extendedHeights[i-1][j-1] = largest;
                    }
                }
                if (largest > 3) {
                    total += (largest - 3);
                }
            }
        }

        this.cubes = total;
        this.cubePositionsF32 = new Float32Array(4 * total);
        this.cubeTypes = new Float32Array(total);
        this.perlinSeeds = new Float32Array(total);
        let seedRNG = new Rand(this.x + " " + this.y + " seed");

        let idx = 0;
        let scale = 64 / this.size;
        for (let i = 0; i < 64; i += scale) {
            for (let j = 0; j < 64; j += scale) {
                let height: number = Math.floor(this.heights[i][j]);
                let val = 3;
                if (extendedHeights[i][j] > val) {
                    val = extendedHeights[i][j];
                }
                for (let k = height - val; k <= height; k++) {
                    this.cubePositionsF32[idx + 0] = topleftx + j;
                    this.cubePositionsF32[idx + 1] = k;
                    this.cubePositionsF32[idx + 2] = toplefty +  i;
                    this.cubePositionsF32[idx + 3] = 0;
                    this.cubeTypes[idx / 4] = types[i][j];
                    this.perlinSeeds[idx / 4] = seedRNG.next();
                    idx+=4;
                }
            }
        }
    }

    private getExpandedMatrix(length: number, val: number): number[][]{
        let expandedLength = length + 2;
        let expandedMatrix = new Array(expandedLength);

        expandedMatrix[0] = new Array(expandedLength);
        // top left neighbor
        let tl_rng = new Rand((this.x - 64) + " " + (this.y - 64) + " " + length);
        let tl = this.noise(length, tl_rng, val);
        expandedMatrix[0][0] = tl[length - 1][length - 1];

        // top right neighbor
        let tr_rng = new Rand((this.x + 64) + " " + (this.y - 64) + " " + length);
        let tr = this.noise(length, tr_rng, val);
        expandedMatrix[0][expandedLength - 1] = tr[length - 1][0];

        // top middle neighbor
        let tm_rng = new Rand((this.x) + " " + (this.y - 64) + " " + length)
        let tm = this.noise(length, tm_rng, val);
        for (let i = 0; i < length; i++) {
            expandedMatrix[0][i + 1] = tm[length - 1][i];
        }

        for (let x = 0; x < length; x++) {
            expandedMatrix[x + 1] = new Array(expandedLength);
        }
        // middle left neighbor
        let ml_rng = new Rand((this.x - 64) + " " + (this.y) + " " + length);
        let ml = this.noise(length, ml_rng, val);
        for (let j = 0; j < length; j++) {
            expandedMatrix[j + 1][0] = ml[j][length - 1];
        }

        // middle right neighbor
        let mr_rng = new Rand((this.x + 64) + " " + (this.y) + " " + length);
        let mr = this.noise(length, mr_rng, val);
        for(let j = 0; j < length; j++) {
            expandedMatrix[j + 1][expandedLength - 1] = mr[j][0];
        }

        expandedMatrix[expandedLength - 1] = new Array(expandedLength);
        // bot left neighbor
        let bl_rng = new Rand((this.x - 64) + " " + (this.y + 64) + " " + length);
        let bl = this.noise(length, bl_rng, val);
        expandedMatrix[expandedLength - 1][0] = bl[0][length - 1];

        // top right neighbor
        let br_rng = new Rand((this.x + 64) + " " + (this.y + 64) + " " + length);
        let br = this.noise(length, br_rng, val);
        expandedMatrix[expandedLength - 1][expandedLength - 1] = br[0][0];

        // top middle neighbor
        let bm_rng = new Rand((this.x) + " " + (this.y + 64) + " " + length)
        let bm = this.noise(length, bm_rng, val);
        for (let i = 0; i < length; i++) {
            expandedMatrix[expandedLength - 1][i + 1] = bm[0][i];
        }

        // current chunk
        let matrix = this.noise(length, new Rand(this.x + " " + this.y + " " + length), val);
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                expandedMatrix[r + 1][c + 1] = matrix[r][c];
            }
        }

        return expandedMatrix;
    }

    private noise(length: number, rng: Rand, val: number) {
        let matrix: number[][] = new Array(length);
        for (let i = 0; i < length; i++) {
            matrix[i] = new Array(length);
            for (let j = 0; j < length; j++){
                matrix[i][j] = Math.floor(val * rng.next());
            }
        }
        return matrix;
    }

    private upsample(matrix: number[][], length: number): number[][] {
        let newLength: number = (length * 2) + 2;
        let newMatrix: number[][] = Array.from(Array(newLength), _ => Array(newLength).fill(0));
        for (let i = 0; i < newLength; i++) {
            for (let j = 0; j < newLength; j++) {
                let r = i / 2 + 0.5;
                let c = j / 2 + 0.5;

                let rBool = r % 1 == 0;
                let cBool = c % 1 == 0;

                let x = Math.floor(c);
                let y = Math.floor(r);
                
                let result = 9 * matrix[y][x];
                if (rBool && cBool) {
                    // top left
                    result += 3 * matrix[y-1][x] + 3 * matrix[y][x-1] + matrix[y-1][x-1];
                } else if (rBool && !cBool) {
                    // top right
                    result += 3 * matrix[y-1][x] + 3 * matrix[y][x+1] + matrix[y-1][x+1];
                } else if (!rBool && cBool) {
                    // bot left
                    result += 3 * matrix[y+1][x] + 3 * matrix[y][x-1] + matrix[y+1][x-1];
                } else {
                    // bot right
                    result += 3 * matrix[y+1][x] + 3 * matrix[y][x+1] + matrix[y+1][x+1];
                }
                newMatrix[i][j] = result / 16;
            }
        }
        return newMatrix;
    }

    private upsampleHelper(matrix: number[][], length: number): number[][] {
        while (length < 64) {
            matrix = this.upsample(matrix, length);
            length *= 2;
        }
        return matrix;
    }
    
    public cubePositions(): Float32Array {
        return this.cubePositionsF32;
    }
    
    
    public numCubes(): number {
        return this.cubes;
    }

    public checkGround(position: Vec3): boolean {
        if (this.heights.length != 64) {
            return false;
        }
        let y = Math.floor(position.y - 2);
        let x1 = position.x + 32 - this.x - 0.4;
        let z1 = position.z + 32 - this.y - 0.4;
        let x2 = Math.min(x1 + 0.8, 63);
        let z2 = Math.min(z1 + 0.8, 63);
        x1 = Math.max(0, Math.min(x1, 63));
        z1 = Math.max(0, Math.min(z1, 63));
        x1 = Math.floor(x1);
        z1 = Math.floor(z1);
        x2 = Math.floor(x2);
        z2 = Math.floor(z2);
        if (this.heights[z1][x1] >= y) {
            return true;
        }
        if (this.heights[z1][x2] >= y) {
            return true;
        }
        if (this.heights[z2][x1] >= y) {
            return true;
        }
        if (this.heights[z2][x2] >= y) {
            return true;
        }
        return false;
    }

    public checkCollision(position: Vec3, walkDir: Vec3): boolean {
        let y = Math.floor(position.y - 2);
        let x = (position.x + 32 - this.x);
        let z = (position.z + 32 - this.y); 
        if (walkDir.x <= 0) {
            x = Math.max(Math.floor(x - 0.4), 0);
        } else if (walkDir.x > 0) {
            x = Math.min(Math.ceil(x + 0.4), 63);
        }
        if (walkDir.z <= 0) {
            z = Math.max(Math.floor(z - 0.4), 0);
        } else if (walkDir.z > 0) {
            z = Math.min(Math.ceil(z + 0.4), 63);
        }
        if (this.heights[z][x] > y) {
            return true;
        }
        return false;
    }

    public getCubeTypes(): Float32Array {
        return this.cubeTypes;
    }

    public getSeeds(): Float32Array {
        return this.perlinSeeds;
    }

    public destroyBlock(ray: Vec3, origin: Vec3) {
        let best = 1e10;
        let idx = -1;
        for(let i = 0; i < this.numCubes(); i++) {
            let x = this.cubePositionsF32[4 * i];
            let y = this.cubePositionsF32[4 * i + 1];
            let z = this.cubePositionsF32[4 * i + 2];
            let cubeCenter = new Vec3([x, y, z]);
            let length = new Vec3([0.5, 0.5, 0.5]);
            let minVec = Vec3.difference(cubeCenter, length);
            let maxVec = Vec3.sum(cubeCenter, length);
            let tNear = Vec3.difference(minVec, origin).divide(ray);
            let tFar = Vec3.difference(maxVec, origin).divide(ray);
            if (tNear.x > tFar.x) [tNear.x, tFar.x] = [tFar.x, tNear.x];
            if (tNear.y > tFar.y) [tNear.y, tFar.y] = [tFar.y, tNear.y];
            if (tNear.z > tFar.z) [tNear.z, tFar.z] = [tFar.z, tNear.z];
            let tHitNear = Math.max(tNear.x, tNear.y, tNear.z);
            let tHitFar = Math.min(tFar.x, tFar.y, tFar.z);
            if (tHitNear > tHitFar) {
                continue;
            }
            let intersection = Vec3.sum(origin, new Vec3([ray.x * tHitNear, ray.y * tHitNear, ray.z * tHitNear]));
            if (
                intersection.x < minVec.x || intersection.x > maxVec.x ||
                intersection.y < minVec.y || intersection.y > maxVec.y ||
                intersection.z < minVec.z || intersection.z > maxVec.z
            ) {
                continue;
            }
            if (tHitNear < best) {
                best = tHitNear;
                idx = i;
            }
        }
        if (idx != -1) {
            this.cubePositionsF32[4 * idx + 1] = 0;
        }
    }
}
