
# Minecraft

### This was for a project in a Computer Graphics course. Please do not use this for your own assignment, I do not condone cheating. 

Name: Franke Tang
UTEID: ft4282

### Implementation
##### Terrain Synthesis:
###### Value Noise Patch:
Heights were generated using 4 octaves of value noise. The algorithm I used was the example given in class,
where a cell in the upsampled matrix takes values from its 2x2 parent cells, with the ratio of 9:3:3:1.

###### Instanced Cube Rendering:
More cubes were added within Chunk.ts. The new cubes extended at least 3 block down (for mining implementation later),
but will extend further if the neighboring cells have a large difference in height. Overall the number of cubes increased
by 4 * original + constant. 

###### Seamless Chunk Boundaries:
Value Noise Patch was further updated to extend past the original matrix. Instead of a nxn matrix, we would take
the neighboring chunks' cells and attached it to our original matrix for a (n+2)x(n+2) matrix. This way each chunk can
know the heights of its neighbor and mix accordingly. To make sure that this stays constistent (especially with chunk
loading), we made sure that each cell had the same seed each time. The seed was based on the x and y coordinates and which
octave we needed.

###### Lazy Chunk Loading:
Within App.ts, an Array of chunks is generated each time the player position changes. Based on the player position, the
chunk center changes to the closest chunk center. This chunk will now be our middle chunk of a 3x3 chunk. For lazy loading,
these 9 chunks are recreated, a cache recently used chunks is implemented later. Since the chunk seeds are tied to their
xy coordinates, the will always generate in the same way.

##### Procedural Textures:
###### Perlin Noise Implementation:
Perlin noise was created using a psuedorandom number generator. Using the provided functions and the equation provided in
class, the perlin noise function was relatively simple to implement. 

###### Perlin Noise Textures:
The final perlin noise uses 4 octaves of noise at different grid spacing. This noise is added to the ambient lighting and diffuse shading.

###### Textured Blocks:
Three different blocks were created by changing the ka and kd, the 3 types we have are grass, dirt, and stone. The perlin 
noise texture is the same for each block, though the each block has its own seed given as an instanced attribute. The types
were generated randomly in patches with the same value noise used for heights. The threshold for types were determine
arbitrarily.

##### FPS Controls:
###### Collision Detection:
The collision detection first add the walkDir() to the playerPosition() and check if this is a valid movement. The detection
itself resides within the chunk of where the player "will" be. It checks if the character's position within a radius of 0.4 is
inside a xz coordinate of the world and if any of those xz coordinates height is greater than the player's y coordinate.
The ground detection takes the player's coordinate and checks the xz cubes that overlap with the radius. The overlap positions
compared their height to the player's y coordinate.

###### Gravity:
The player has a velocity component that subtracts from the player's y coordinate. If the player is on the ground, the 
velocity is always set to 0. The velocity changes based an acceleration variable that increases the velocity overtime.

###### Jumping:
The jump function first checks if the player is on the ground. If they are, the velocity is set to an initial negative 
velocity, sending them upward and then slowly descending.

### Extra Credit:
###### Day-Night cycle:
The lightPosition changes on the yz-plane. Similar to the velocity, the change in lightposition is based on the change in
theta (the theta changes over time). The y and z coordinates (oscillates between 1000 and -1000). I added a function into
RenderPass that changes the uniform value for "uLightPos". By pressing the "T" key, the speed of the light position changes.
There are 3 modes "slow", "medium", and "fast", by press "T" it cycles between them. When changing speed, the light position
still remains the same (night if originally night and day if originally day), had a bug for a bit that track different 
position for different  speeds. 
- Implementation in App.ts and RenderPass.ts

###### Chunk loading improvement / Hystersis:
A cache was added that keeps track of last recently used chunks. So if a chunk has already been used recently, pull from the
cache instead of generating all over again. This fixes the stuttering affect of going in and out of a chunk. The cache is 
arbituary set to a chunk limit of 21, going over it kicks out the chunk that has not been used recently.
- Implementation in App.ts

###### Lower detail in the Horizon:
Lower detail cubes were generated for distant chunks. The total number of chunks render increased from 9 to 49. The middle
(5x5) 25 chunks is still generated as normal. However, the faraway 24 chunks have lower resolution larger cubes. A new 
renderpass was created for distantCubes whose size is double that of the original cube. Cube.ts is slightly modified to
accept values for position instead of just 0.5. So the distant cubes are twice as large, and so the chunks themselves have
half the number of cubes. While the original 64x64 is generated within Chunk.ts (this keeps the orignal shape), we only
sample 32x32 by skipping every other position. The reduces the amount of cubes needed to be textured by half for faraway 
chunks. 3 chunks away was chosen for "distant" cubes as the popping of low-detail to high-detail is less noticable. While
16x16 heights and quadruple size is possible, it was not used as the detail was too low for 3 chunks away and 9x9 chunks was a
lot of chunks to texture.
- Implementation in App.ts, Chunk.ts, and Cube.ts


###### Mining Blocks:
Very simple (and buggy) implementation of ray and cube intersection occurs when user presses the "M". The closest cube 
intersected by the "+" cursor is "destroyed" (sent to height of 0 currently). The code itself is still really bugging, but a 
cube is "destroyed" visually. The cubes is only visually removed  currently, however, the collision detection has not been 
updated to deal with blocks being destroyed. The ray-cube intersection works better at hitting cubes below player current y 
position (not sure why... but looking at a cube below or at eye level works generally pretty well). No block placing or
inventory has been added.
- Implementation in Gui.ts and Chunk.ts (App.ts to access chunk)
