// Echtzeit-Eingaben. Bewusst KEIN React-State (würde 60x/s neu rendern).
// Touch-Buttons und Tastatur schreiben hier rein, der Render-Loop liest.
export const controls = {
  throttle: false,
  steerLeft: false,
  steerRight: false,
  drift: false,
  boost: false,
  // Handy-freundlich: Kart gibt selbst Gas, `brake` hält es kurz an.
  autoThrottle: false,
  brake: false,
  useItem: false, // Banane ablegen
}

export function resetControls() {
  controls.throttle = false
  controls.steerLeft = false
  controls.steerRight = false
  controls.drift = false
  controls.boost = false
  controls.brake = false
  controls.useItem = false
}

// Tastatur für bequemes Testen am Desktop.
export function attachKeyboard(): () => void {
  const down = (e: KeyboardEvent) => set(e.code, true)
  const up = (e: KeyboardEvent) => set(e.code, false)
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
  }
}

function set(code: string, v: boolean) {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      controls.throttle = v
      break
    case 'ArrowLeft':
    case 'KeyA':
      controls.steerLeft = v
      break
    case 'ArrowRight':
    case 'KeyD':
      controls.steerRight = v
      break
    case 'ArrowDown':
    case 'KeyS':
      controls.brake = v
      break
    case 'KeyE':
      controls.useItem = v
      break
    case 'Space':
      controls.drift = v
      break
    case 'ShiftLeft':
    case 'ShiftRight':
      controls.boost = v
      break
  }
}
