import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppleIcon from '../components/AppleIcon';
import './AboutPage.css';

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
        </div>
      </header>

      <section className="about-section">
        <h2>{t('about.sectionFeaturesTitle')}</h2>
        <div className="about-feature-grid">
          <article className="about-card">
            <AppleIcon name="edit" size="small" className="about-card-icon" />
            <h3>{t('about.featureEditorTitle')}</h3>
            <p>{t('about.featureEditorCopy')}</p>
          </article>
          <article className="about-card">
            <AppleIcon name="history" size="small" className="about-card-icon" />
            <h3>{t('about.featureBranchTitle')}</h3>
            <p>{t('about.featureBranchCopy')}</p>
          </article>
          <article className="about-card">
            <AppleIcon name="external-link" size="small" className="about-card-icon" />
            <h3>{t('about.featureShareTitle')}</h3>
            <p>{t('about.featureShareCopy')}</p>
          </article>
          <article className="about-card">
            <AppleIcon name="lock" size="small" className="about-card-icon" />
            <h3>{t('about.featureGuestTitle')}</h3>
            <p>{t('about.featureGuestCopy')}</p>
          </article>
        </div>
      </section>

      <section className="about-section">
        <h2>{t('about.sectionArchitectureTitle')}</h2>
        <div className="about-architecture">
          <div className="about-architecture-card">
            <h3>{t('about.architectureBranchesTitle')}</h3>
            <p>{t('about.architectureBranchesCopy')}</p>
            <a href="https://github.com/ziin-ai/mindmap/tree/main/docs/BRANCH_ARCHITECTURE.md" target="_blank" rel="noreferrer">
              {t('about.learnMore')} →
            </a>
          </div>
          <div className="about-architecture-card">
            <h3>{t('about.architectureIndexTitle')}</h3>
            <p>{t('about.architectureIndexCopy')}</p>
            <a href="https://github.com/ziin-ai/mindmap/tree/main/docs/INDEX_DB_ARCHITECTURE.md" target="_blank" rel="noreferrer">
              {t('about.learnMore')} →
            </a>
          </div>
          <div className="about-architecture-card">
            <h3>{t('about.architectureDeployTitle')}</h3>
            <p>{t('about.architectureDeployCopy')}</p>
            <a href="https://github.com/ziin-ai/mindmap/tree/main/docs/DEPLOY.md" target="_blank" rel="noreferrer">
              {t('about.learnMore')} →
            </a>
          </div>
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

      <section className="about-section about-section-cta">
        <div className="about-cta-card">
          <div>
            <h2>{t('about.sectionCommunityTitle')}</h2>
            <p>{t('about.sectionCommunityCopy')}</p>
          </div>
          <div className="about-cta-links">
            <a href="https://github.com/ziin-ai/mindmap" target="_blank" rel="noreferrer" className="button button-secondary">
              GitHub ↗
            </a>
            <Link to="/dashboard" className="button button-primary">
              {t('about.heroCta')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

