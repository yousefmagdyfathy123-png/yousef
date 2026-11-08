import { companyBrand as brand } from './brand';
import './marketing.css';

export function PublicFooter() {
  return <footer className="public-footer">
    <div className="public-wrap public-footer-grid">
      <div>
        <a href={brand.companyUrl} aria-label="ALFA CORE company website">
          <img className="public-full-logo" src={brand.fullLogo} width={500} height={221}
            alt="ALFA CORE Engineering & Business Solution" />
        </a>
        <p>{brand.productName} by {brand.companyName}</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/">Home</a>
        <a href={brand.companyUrl}>{brand.companyName}</a>
        <a href="/pricing">Pricing</a>
        <a href={'mailto:' + brand.supportEmail}>{brand.supportEmail}</a>
        <a href="/policies/purchase">Purchase policy</a>
      </nav>
    </div>
    <p className="public-wrap public-reference">Engineering reference only. Verify suitability for your application.</p>
  </footer>;
}
