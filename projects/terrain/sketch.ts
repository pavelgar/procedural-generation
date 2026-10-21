import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createNoise2D, fbm } from '@/lib/noise'
import { defineSketch } from '@/lib/sketch'

/** Width of the terrain in world units. */
const SIZE = 10

const colors = {
  deep: new THREE.Color('#1d3557'),
  shallow: new THREE.Color('#3a86a8'),
  sand: new THREE.Color('#d9c38a'),
  grass: new THREE.Color('#5a8f3c'),
  forest: new THREE.Color('#2f5d2a'),
  rock: new THREE.Color('#6b5e55'),
  snow: new THREE.Color('#f2f2f2'),
}

/** Land color by height above the water: 0 at the shore, 1 at the highest peaks. */
function landColor(t: number) {
  if (t < 0.03) return colors.sand
  if (t < 0.25) return colors.grass
  if (t < 0.5) return colors.forest
  if (t < 0.75) return colors.rock
  return colors.snow
}

export default defineSketch({
  animate: true,
  params: {
    resolution: { value: 160, min: 32, max: 320, step: 16 },
    scale: { value: 1.6, min: 0.3, max: 5, label: 'noise scale' },
    octaves: { value: 6, min: 1, max: 8, step: 1 },
    persistence: { value: 0.5, min: 0.2, max: 0.8 },
    height: { value: 2.5, min: 0.2, max: 5 },
    water: { value: 0.4, min: 0, max: 0.8, label: 'water level' },
    island: { value: 0.8, min: 0, max: 1.5, label: 'island falloff' },
    spin: { value: true, label: 'auto-rotate' },
  },

  setup({ canvas, params, width, height, pixelRatio }) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#17171b')
    scene.add(new THREE.HemisphereLight('#dfe8ff', '#3a2f28', 1.2))
    const sun = new THREE.DirectionalLight('#fff4e0', 2.5)
    sun.position.set(5, 8, 3)
    scene.add(sun)

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(11, 8.5, 11)
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.autoRotateSpeed = 0.6
    controls.maxPolarAngle = Math.PI * 0.45

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
    })
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
    scene.add(mesh)

    return {
      generate({ rng }) {
        const noise = createNoise2D(rng)
        const geometry = new THREE.PlaneGeometry(
          SIZE,
          SIZE,
          params.resolution,
          params.resolution,
        ).rotateX(-Math.PI / 2)
        const position = geometry.getAttribute('position')
        const vertexColors = new Float32Array(position.count * 3)
        const color = new THREE.Color()

        for (let i = 0; i < position.count; i++) {
          // In [-0.5, 0.5] across the terrain.
          const x = position.getX(i) / SIZE
          const z = position.getZ(i) / SIZE
          const noiseHeight = fbm(noise, x * params.scale, z * params.scale, {
            octaves: params.octaves,
            persistence: params.persistence,
          })
          // Pull the edges down so the land forms an island.
          const edge = 2 * Math.hypot(x, z)
          const elevation = noiseHeight * 0.5 + 0.5 - params.island * edge * edge * 0.6

          if (elevation < params.water) {
            const depth = (params.water - elevation) / Math.max(params.water, 0.01)
            color.lerpColors(colors.shallow, colors.deep, Math.min(1, depth * 3))
            position.setY(i, 0)
          } else {
            const t = (elevation - params.water) / (1 - params.water)
            color.copy(landColor(t))
            // Flat lowlands, steep peaks.
            position.setY(i, params.height * t ** 1.5)
          }
          color.toArray(vertexColors, i * 3)
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
        geometry.computeVertexNormals()
        mesh.geometry.dispose()
        mesh.geometry = geometry
      },

      resize({ width, height, pixelRatio }) {
        renderer.setPixelRatio(pixelRatio)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      },

      render({ dt }) {
        controls.autoRotate = params.spin
        controls.update(dt)
        renderer.render(scene, camera)
      },

      dispose() {
        controls.dispose()
        mesh.geometry.dispose()
        material.dispose()
        renderer.dispose()
      },
    }
  },
})
