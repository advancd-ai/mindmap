import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppleIcon from '../components/AppleIcon';
import './AboutPage.css';

const highlightCardSpecs = [
  { icon: 'add', titleKey: 'about.highlightQuickStartTitle', copyKey: 'about.highlightQuickStartCopy' },
  { icon: 'history', titleKey: 'about.highlightAutoSaveTitle', copyKey: 'about.highlightAutoSaveCopy' },
  { icon: 'edit', titleKey: 'about.highlightKeyboardTitle', copyKey: 'about.highlightKeyboardCopy' },
  { icon: 'external-link', titleKey: 'about.highlightShareTitle', copyKey: 'about.highlightShareCopy' },
] as const;

const comfortSpecs = [
  {
    icon: 'folder',
    titleKey: 'about.comfortNoSetupTitle',
    copyKey: 'about.comfortNoSetupCopy',
    bulletKeys: [
      'about.comfortNoSetupBullet1',
      'about.comfortNoSetupBullet2',
      'about.comfortNoSetupBullet3',
    ],
  },
  {
    icon: 'connect',
    titleKey: 'about.comfortFlowTitle',
    copyKey: 'about.comfortFlowCopy',
    bulletKeys: [
      'about.comfortFlowBullet1',
      'about.comfortFlowBullet2',
      'about.comfortFlowBullet3',
    ],
  },
  {
    icon: 'image',
    titleKey: 'about.comfortMediaTitle',
    copyKey: 'about.comfortMediaCopy',
    bulletKeys: [
      'about.comfortMediaBullet1',
      'about.comfortMediaBullet2',
      'about.comfortMediaBullet3',
    ],
  },
] as const;

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="about-page page">
      <header className="about-hero">
        <div className="about-hero-content">
          <span className="about-badge">{t('about.badge')}</span>
          <h1>{t('about.heroTitle')}</h1>
          <p>{t('about.heroSubtitle')}</p>
          <div className="about-cta">
            <Link to="/dashboard" className="button button-primary">
              <AppleIcon name="add" size="small" />
              {t('about.heroCta')}
            </Link>
            <Link to="/editor" className="button button-secondary">
              {t('about.heroSecondaryCta')}
            </Link>
          </div>
        </div>
        <div className="about-hero-illustration" aria-hidden>
          <div className="about-hero-grid" />
          <img src="/hero-illustration.png" alt="" className="about-hero-image" />
        </div>
      </header>

      <section className="about-section">
        <div className="about-section-heading">
          <h2>{t('about.sectionHighlightsTitle')}</h2>
          <p className="about-section-subtitle">{t('about.sectionHighlightsSubtitle')}</p>
        </div>
        <div className="about-feature-grid">
          {highlightCardSpecs.map((card) => (
            <article className="about-card" key={card.titleKey}>
              <AppleIcon name={card.icon} size="small" className="about-card-icon" />
              <h3>{t(card.titleKey)}</h3>
              <p>{t(card.copyKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section about-section-comfort">
        <div className="about-section-heading">
          <h2>{t('about.sectionComfortTitle')}</h2>
          <p className="about-section-subtitle">{t('about.sectionComfortSubtitle')}</p>
        </div>
        <div className="about-comfort-grid">
          {comfortSpecs.map((card) => (
            <article className="about-comfort-card" key={card.titleKey}>
              <div className="about-comfort-card-header">
                <AppleIcon name={card.icon} size="small" className="about-card-icon" />
                <div>
                  <h3>{t(card.titleKey)}</h3>
                  <p>{t(card.copyKey)}</p>
                </div>
              </div>
              <ul className="about-comfort-list">
                {card.bulletKeys.map((bullet) => (
                  <li key={bullet}>
                    <AppleIcon name="check" size="xs" className="about-comfort-bullet-icon" />
                    <span>{t(bullet)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section about-section-timeline">
        <h2>{t('about.sectionWorkflowTitle')}</h2>
        <ol className="about-timeline">
          <li>
            <span className="about-timeline-step">1</span>
            <div>
              <h3>{t('about.workflowCreateTitle')}</h3>
              <p>{t('about.workflowCreateCopy')}</p>
            </div>
          </li>
          <li>
            <span className="about-timeline-step">2</span>
            <div>
              <h3>{t('about.workflowCollaborateTitle')}</h3>
              <p>{t('about.workflowCollaborateCopy')}</p>
            </div>
          </li>
          <li>
            <span className="about-timeline-step">3</span>
            <div>
              <h3>{t('about.workflowShareTitle')}</h3>
              <p>{t('about.workflowShareCopy')}</p>
            </div>
          </li>
        </ol>
      </section>

    </div>
  );
}

