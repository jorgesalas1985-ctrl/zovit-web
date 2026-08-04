"use client";

import Image from "next/image";

/**
 * Historia en loop: necesidad → búsqueda en mapa → match → trabajo →
 * pago protegido → aprobación → liberación.
 */
export function HomeHeroStory() {
  return (
    <div className="homeStory" aria-hidden="true">
      <div className="homeStoryGlow" />
      <div className="homeStoryFrame">
        <div className="homeStoryStage">
          {/* Escena base: pared */}
          <div className="homeStoryWallStage">
            <div className="homeStoryWall homeStoryWall--damaged">
              <div className="homeStoryWallTexture" />
              <div className="homeStoryWallCrack" />
              <div className="homeStoryWallPeel" />
              <div className="homeStoryWallStain" />
            </div>
            <div className="homeStoryWall homeStoryWall--work">
              <div className="homeStoryWallTexture homeStoryWallTexture--fresh" />
              <div className="homeStoryPaintStroke homeStoryPaintStroke--1" />
              <div className="homeStoryPaintStroke homeStoryPaintStroke--2" />
              <div className="homeStoryPaintStroke homeStoryPaintStroke--3" />
              <div className="homeStoryWorker">
                <div className="homeStoryBrush homeStoryBrush--1" />
                <div className="homeStoryBrush homeStoryBrush--2" />
              </div>
            </div>
            <div className="homeStoryWall homeStoryWall--done">
              <div className="homeStoryWallTexture homeStoryWallTexture--done" />
              <div className="homeStoryDoneSheen" />
            </div>
          </div>

          {/* Búsqueda en mapa (IA visual) */}
          <div className="homeStoryMapPanel">
            <Image
              src="/home/story-map-search.png"
              alt=""
              fill
              sizes="(max-width: 900px) 90vw, 520px"
              className="homeStoryMapImage"
              priority
            />
            <div className="homeStoryMapOverlay">
              <span className="homeStoryMapPulse" />
              <span className="homeStoryMapPin homeStoryMapPin--1" />
              <span className="homeStoryMapPin homeStoryMapPin--2" />
              <span className="homeStoryMapPin homeStoryMapPin--3" />
            </div>
            <div className="homeStoryMapBadge">Mapa · cerca de ti</div>
          </div>

          <div className="homeStoryNearbyShot">
            <Image
              src="/home/story-pro-nearby.png"
              alt=""
              fill
              sizes="(max-width: 900px) 70vw, 280px"
              className="homeStoryNearbyImage"
            />
            <span className="homeStoryNearbyTag">Profesional en camino</span>
          </div>

          {/* Cliente + teléfono */}
          <div className="homeStoryClient">
            <div className="homeStoryPerson">
              <span className="homeStoryPersonHead" />
              <span className="homeStoryPersonBody" />
            </div>
            <div className="homeStoryPhone">
              <div className="homeStoryPhoneNotch" />
              <div className="homeStoryPhoneScreen">
                <span className="homeStoryPhoneBrand">ZOVIT</span>
                <p className="homeStoryPhoneHint">Pintura · Living</p>
                <div className="homeStoryPhoneBtn">Solicitar pintor</div>
                <div className="homeStoryPhoneMap">
                  <span className="homeStoryPhoneMapGrid" />
                  <span className="homeStoryPhoneMapDot" />
                  <span className="homeStoryPhoneMapPin" />
                  <em>Mapa en vivo</em>
                </div>
                <div className="homeStoryPhoneApprove">Trabajo aprobado</div>
              </div>
            </div>
          </div>

          {/* Conector luminoso */}
          <svg className="homeStoryConnector" viewBox="0 0 320 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="zovitStoryLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="55%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="zovitStoryGlow" x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              className="homeStoryConnectorPath"
              d="M16 78 C90 16, 190 16, 304 42"
              fill="none"
              stroke="url(#zovitStoryLine)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#zovitStoryGlow)"
            />
            <circle className="homeStoryConnectorDot" cx="16" cy="78" r="3.5" fill="#7c3aed" />
            <circle className="homeStoryConnectorDot homeStoryConnectorDot--end" cx="304" cy="42" r="3.5" fill="#06b6d4" />
          </svg>

          {/* Lista de profesionales */}
          <div className="homeStoryPros">
            <div className="homeStoryProCard">
              <span className="homeStoryProAvatar homeStoryProAvatar--a" />
              <div>
                <strong>Carlos R.</strong>
                <span>Pintor · 4.8 · 1.2 km</span>
              </div>
            </div>
            <div className="homeStoryProCard homeStoryProCard--highlight">
              <span className="homeStoryProAvatar homeStoryProAvatar--b" />
              <div>
                <strong>María L.</strong>
                <span>Pintora · 4.9 · 800 m</span>
              </div>
              <em className="homeStoryProBadge">Trabajo aceptado</em>
            </div>
            <div className="homeStoryProCard">
              <span className="homeStoryProAvatar homeStoryProAvatar--c" />
              <div>
                <strong>Andrés P.</strong>
                <span>Pintor · 4.7 · 2.1 km</span>
              </div>
            </div>
          </div>

          {/* Candado / pago */}
          <div className="homeStoryEscrow">
            <div className="homeStoryLock homeStoryLock--closed">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span>Pago protegido por Zovit</span>
            </div>
            <div className="homeStoryLock homeStoryLock--open">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 7.5-1.5" />
              </svg>
              <span>Pago liberado al profesional</span>
            </div>
            <div className="homeStoryPayout">
              <span className="homeStoryPayoutCoin homeStoryPayoutCoin--1" />
              <span className="homeStoryPayoutCoin homeStoryPayoutCoin--2" />
              <span className="homeStoryPayoutCoin homeStoryPayoutCoin--3" />
            </div>
          </div>
        </div>

        <p className="homeStoryCaption">
          <span className="homeStoryCaptionText homeStoryCaptionText--1">Necesitas un servicio</span>
          <span className="homeStoryCaptionText homeStoryCaptionText--map">Buscas en el mapa</span>
          <span className="homeStoryCaptionText homeStoryCaptionText--2">Profesionales cercanos responden</span>
          <span className="homeStoryCaptionText homeStoryCaptionText--3">Trabajo en curso · pago seguro</span>
          <span className="homeStoryCaptionText homeStoryCaptionText--4">Tú apruebas · el pago se libera</span>
        </p>

        <div className="homeStoryProgress">
          <span className="homeStoryProgressBar" />
        </div>
      </div>
    </div>
  );
}
