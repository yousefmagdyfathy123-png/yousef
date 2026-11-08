import { companyBrand as brand } from './brand';
import { MobileNav } from './MobileNav';
import './marketing.css';

export function PublicHeader() {
  return <header className="public-header">
    <a className="public-skip" href="#main-content">Skip to content</a>
    <div className="public-wrap public-header-row">
      <a className="public-brand" href="/" aria-label="Alfadata home">
        <img src={brand.compactLogo} width={353} height={140} alt="ALFA" />
        <span>{brand.productName}</span>
      </a>
      <nav className="public-desktop-nav" aria-label="Main navigation">
        <a href="/#features">Features</a>
        <a href="/#example">Example</a>
        <a href="/pricing">Pricing</a>
        <a href="/sign-in">Sign in</a>
        <a className="public-trial" href="/sign-up">Start free trial</a>
      </nav>
      <MobileNav />
    </div>
  </header>;
}
