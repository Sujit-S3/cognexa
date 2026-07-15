import { ThemeProvider, useSmoothScroll } from './design'
import { Hero } from './sections/Hero'
import { CourseCatalog } from './sections/CourseCatalog'
import { ProgressDemo } from './sections/ProgressDemo'
import { Features } from './sections/Features'
import { Testimonials } from './sections/Testimonials'
import { EnrollCTA } from './sections/EnrollCTA'

function Shell() {
  useSmoothScroll()
  return (
    <main className="nx-shell">
      <Hero />
      <CourseCatalog />
      <ProgressDemo />
      <Features />
      <Testimonials />
      <EnrollCTA />
    </main>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  )
}

export default App
