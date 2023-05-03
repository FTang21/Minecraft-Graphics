export const blankCubeVSText = `
    precision mediump float;

    uniform vec4 uLightPos;    
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aNorm;
    attribute vec4 aVertPos;
    attribute vec4 aOffset;
    attribute vec2 aUV;
    attribute float cubeType;
    attribute float pSeed;
    
    varying vec4 normal;
    varying vec4 wsPos;
    varying vec2 uv;
    varying float perlinSeed;
    varying float type;

    void main () {
        gl_Position = uProj * uView * (aVertPos + aOffset);
        wsPos = aVertPos + aOffset;
        normal = normalize(aNorm);
        uv = aUV;
        perlinSeed = pSeed;
        type = cubeType;
    }
`;
export const blankCubeFSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    
    varying vec4 normal;
    varying vec4 wsPos;
    varying vec2 uv;
    varying float perlinSeed;
    varying float type;

    float random (vec2 pt, float seed) {
        return fract(sin( (seed + dot(pt.xy, vec2(12.9898,78.233))))*43758.5453123);
    }
        
    vec2 unit_vec(vec2 xy, float seed) {
        float theta = 6.28318530718*random(xy, seed);
        return vec2(cos(theta), sin(theta));
    }

    float smoothmix(float a0, float a1, float w) {
        return (a1 - a0) * (3.0 - w * 2.0) * w * w + a0;
    }

    float perlin(vec2 bary, float spacing, float seed) {
        vec2 p = floor(bary / spacing);
        vec2 f = fract(bary / spacing);

        vec2 ahat = unit_vec(p + vec2(0.0, 0.0), seed);
        vec2 bhat = unit_vec(p + vec2(1.0, 0.0), seed);
        vec2 chat = unit_vec(p + vec2(0.0, 1.0), seed);
        vec2 dhat = unit_vec(p + vec2(1.0, 1.0), seed);
        
        vec2 avec = f - vec2(0.0, 0.0);
        vec2 bvec = f - vec2(1.0, 0.0);
        vec2 cvec = f - vec2(0.0, 1.0);
        vec2 dvec = f - vec2(1.0, 1.0);

        float a = dot(ahat, avec);
        float b = dot(bhat, bvec);
        float c = dot(chat, cvec);
        float d = dot(dhat, dvec);

        return smoothmix(smoothmix(a, b, f.x), smoothmix(c, d, f.x), f.y);
    }
    
    void main() {
        vec3 kdStone = vec3(0.7, 0.7, 0.7);
        vec3 kaStone = vec3(0.1, 0.1, 0.1);

        vec3 kdGreen = vec3(0.0, 0.5, 0.0);
        vec3 kaGreen = vec3(0.0, 0.1, 0.0);

        vec3 kdDirt = vec3(0.5, 0.3, 0.1);
        vec3 kaDirt = vec3(0.1, 0.1, 0.1);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        if(lightDirection.y < 0.0) {
            lightDirection.x = lightDirection.x / 10.0;
            lightDirection.z = lightDirection.z / 10.0;
        }
        float dot_nl = dot(normalize(lightDirection), normalize(normal));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
	
        float noise1 = perlin(uv, 0.5, perlinSeed);
        float noise2 = perlin(uv, 0.25, perlinSeed);
        float noise3 = perlin(uv, 0.1, perlinSeed);
        float noise4 = perlin(uv, 0.05, perlinSeed);
        float noiseColor = (0.1 * noise1 + 0.1 * noise2 + 0.1 * noise3 + 0.1 * noise4);

        if (type < 0.75) {
            vec4 dirtColor = vec4(noiseColor, noiseColor, 0.0, 1.0);
            vec3 dirtLighting = clamp(kaDirt + dot_nl * kdDirt, 0.0, 1.0);
            gl_FragColor = vec4(dirtLighting, 1.0) + dirtColor;
        } else if (type < 1.05) {
            vec4 grassColor = vec4(0.0, noiseColor, 0.0, 1.0);
            vec3 grassLighting = clamp(kaGreen + dot_nl * kdGreen, 0.0, 1.0);
            gl_FragColor = vec4(grassLighting, 1.0) + grassColor;
        } else {
            vec4 stoneColor = vec4(clamp(noiseColor + kaStone + dot_nl * kdStone, 0.0, 1.0), 1.0);
            gl_FragColor = stoneColor;
        }
    }
`;
//# sourceMappingURL=Shaders.js.map