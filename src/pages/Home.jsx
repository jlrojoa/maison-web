import { useReveal } from '../hooks/useReveal'
import Nav from '../components/Nav'
import Hero from '../components/Hero'
import Marquee from '../components/Marquee'
import Philosophy from '../components/Philosophy'
import Collections from '../components/Collections'
import Materials from '../components/Materials'
import Editorial from '../components/Editorial'
import Kit from '../components/Kit'
import LeadForm from '../components/LeadForm'
import Footer from '../components/Footer'

export default function Home() {
  useReveal()

  return (
    <div id="mp">
      <Nav />
      <Hero />
      <Marquee />
      <Philosophy />
      <Collections />
      <Materials />
      <Editorial />
      <Kit />
      <LeadForm />
      <Footer />
    </div>
  )
}
