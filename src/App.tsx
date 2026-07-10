import { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { sfx } from './audio/sfx'
import { Splash } from './ui/Splash'
import { MainMenu } from './screens/MainMenu'
import { RaceScreen } from './screens/RaceScreen'
import { ResultScreen } from './screens/ResultScreen'
import { PetProfile } from './screens/PetProfile'
import { Garage } from './screens/Garage'
import { DailyTasks } from './screens/DailyTasks'
import { PetEggs } from './screens/PetEggs'
import { Shop } from './screens/Shop'
import { TrackSelect } from './screens/TrackSelect'
import { CupScreen } from './screens/CupScreen'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const [booting, setBooting] = useState(true)

  // Browser erlauben Ton erst nach einer Nutzer-Geste – beim ersten Tippen aufwecken.
  useEffect(() => {
    const wake = () => sfx.resume()
    window.addEventListener('pointerdown', wake, { once: true })
    return () => window.removeEventListener('pointerdown', wake)
  }, [])

  // Renn-Musik im Rennen, sonst ruhige Menü-Musik.
  useEffect(() => {
    sfx.music(screen === 'race' ? 'race' : 'menu')
  }, [screen])

  return (
    <div className="app">
      {booting && <Splash onDone={() => setBooting(false)} />}
      {screen === 'menu' && <MainMenu />}
      {screen === 'race' && <RaceScreen />}
      {screen === 'result' && <ResultScreen />}
      {screen === 'petprofile' && <PetProfile />}
      {screen === 'garage' && <Garage />}
      {screen === 'dailies' && <DailyTasks />}
      {screen === 'eggs' && <PetEggs />}
      {screen === 'shop' && <Shop />}
      {screen === 'tracks' && <TrackSelect />}
      {screen === 'cup' && <CupScreen />}
    </div>
  )
}
