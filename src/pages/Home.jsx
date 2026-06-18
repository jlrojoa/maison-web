import { useState } from 'react'
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
import ProductDetail from './ProductDetail'

export default function Home() {
  useReveal()
  const [selectedProduct, setSelectedProduct] = useState(null)

  if (selectedProduct) {
    return (
      <>
        <Nav />
        <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />
      </>
    )
  }

  return (
    <div id="mp">
      <Nav />
      <Hero />
      <Marquee />
      <Philosophy />
      <Collections onProductClick={setSelectedProduct} />
      <Materials />
      <Editorial />
      <Kit />
      <LeadForm />
      <Footer />
    </div>
  )
}
