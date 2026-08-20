/* eslint-disable @next/next/no-img-element */
import { PageMotion } from "@/components/page-motion";
import { SiteMenu } from "@/components/site-menu";
import { implementationContract } from "@/lib/implementation-contract";
import {
  aboutLines,
  chapters,
  contourGroups,
  footer,
  products,
  type ContourGroupName,
} from "@/lib/moyoy-content";

export const dynamic = "force-static";

const assetRoot = "/assets/moyoy-candidate";

/** DA-FOOTER-01 launch state; the approved copy stays recorded in the content module. */
const policyLinksHidden = implementationContract.launchHiddenFooterPolicyLinks;

/**
 * DA-MOTION-02 asks the contour system to lag behind the document and DA-MOTION-01 asks
 * its objects to separate while it does. One raster cannot do that, so each approved
 * drawing ships as one file per contour path and the scroll controller gives each layer
 * its own depth. At rest the stack is identical to the unsplit export.
 */
function ContourStack({
  className,
  group,
}: Readonly<{ className: string; group: ContourGroupName }>) {
  const { layers, pc } = contourGroups[group];
  return (
    <div aria-hidden="true" className={`decorative contour-stack ${className}`}>
      {Array.from({ length: layers }, (_, index) => (
        <picture className="contour-layer" key={index}>
          <source
            media="(max-width: 639px)"
            srcSet={`${assetRoot}/vector/sp-contours-${group}-layer-${index + 1}.svg`}
          />
          <img
            alt=""
            aria-hidden="true"
            height={Math.round(pc.height)}
            src={`${assetRoot}/vector/pc-contours-${group}-layer-${index + 1}.svg`}
            width={Math.round(pc.width)}
          />
        </picture>
      ))}
    </div>
  );
}

/**
 * The chapter photograph's responsive sources, in one place.
 *
 * The plate and the browser-bar mirror have to resolve to the SAME file at every width:
 * the mirror continues the plate's own frame past the window edge, and two `<picture>`
 * elements that could ever select different derivatives would put a seam in the middle of
 * a photograph. `decorative` gives the mirror an empty alt and hides it from assistive
 * technology, so the chapter still contributes exactly one image to the accessibility
 * tree. The loading attributes are identical, so the mirror shares the plate's request
 * rather than adding one.
 */
function ChapterPhoto({
  chapter,
  decorative,
  eager,
}: Readonly<{
  chapter: (typeof chapters)[number];
  decorative?: boolean;
  eager: boolean;
}>) {
  return (
    <picture>
      <source
        height={chapter.spHeight}
        media="(max-width: 639px)"
        srcSet={`${assetRoot}/photo/sp-${chapter.id}.webp`}
        width={chapter.spWidth}
      />
      <source
        height={chapter.wideHeight}
        media="(min-width: 2401px)"
        srcSet={`${assetRoot}/photo/pc-2560-${chapter.id}.webp 2560w`}
        width="2560"
      />
      <img
        alt={decorative ? "" : chapter.alt}
        aria-hidden={decorative ? "true" : undefined}
        decoding="async"
        fetchPriority="low"
        height={chapter.pcHeight}
        loading={eager ? "eager" : "lazy"}
        src={`${assetRoot}/photo/pc-${chapter.id}.webp`}
        sizes="100vw"
        srcSet={`${assetRoot}/photo/pc-${chapter.id}.webp 1200w, ${assetRoot}/photo/pc-1440-${chapter.id}.webp 1440w, ${assetRoot}/photo/pc-2400-${chapter.id}.webp 2400w`}
        width="2400"
      />
    </picture>
  );
}

export default function MoyoyPage() {
  return (
    <SiteMenu>
      <PageMotion />
      <div className="page-canvas">
        <div className="page-artboard">
          <main data-page="moyoy-lp" data-ready="true">
            <section aria-labelledby="about-heading" className="intro" id="hero">
              <ContourStack className="hero-contours" group="hero" />
              <picture className="brand brand-header">
                <source
                  media="(max-width: 639px)"
                  srcSet={`${assetRoot}/vector/sp-brand-header-line.svg`}
                />
                <img
                  alt="MOYOY"
                  height="15"
                  src={`${assetRoot}/vector/pc-brand-header-line.svg`}
                  width="917"
                />
              </picture>
              <p
                aria-hidden="true"
                className="scroll-indicator"
                data-motion-visible="true"
              >
                <small>scroll</small>
                <span className="scroll-indicator-line" />
              </p>
              <div className="about-copy">
                <h1 id="about-heading">はじまる場所へ</h1>
                <p>
                  {aboutLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
              </div>
              <picture className="brand brand-center">
                <source
                  media="(max-width: 639px)"
                  srcSet={`${assetRoot}/vector/sp-brand-center-line.svg`}
                />
                <img
                  alt=""
                  aria-hidden="true"
                  height="83"
                  src={`${assetRoot}/vector/pc-brand-center-line.svg`}
                  width="261"
                />
              </picture>
              <section aria-label="製品情報" className="products" id="products">
                {products.map((product) => (
                  <article className={`product product-${product.id}`} key={product.id}>
                    <div className="product-drawing">
                      <img
                        alt=""
                        aria-hidden="true"
                        height={Math.round(product.drawingHeight)}
                        src={`${assetRoot}/vector/${product.drawing}`}
                        width={Math.round(product.drawingWidth)}
                      />
                    </div>
                    <div className="product-copy">
                      <p className="product-category">{product.category}</p>
                      <h2>{product.name}</h2>
                      <p className="product-volume">{product.volume}</p>
                      <p className="product-dimensions">{product.dimensions}</p>
                      {product.priceLines.map((line) => (
                        <p className="product-price" key={line}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
              <ContourStack className="product-contours" group="product" />
              <picture className="root-foreground">
                <source
                  media="(max-width: 639px)"
                  srcSet={`${assetRoot}/vector/sp-root-upper-foreground.svg`}
                />
                <img
                  alt=""
                  aria-hidden="true"
                  height="381"
                  src={`${assetRoot}/vector/pc-root-upper-foreground.svg`}
                  width="1200"
                />
              </picture>
            </section>

            {chapters.map((chapter, index) => (
              <section
                className={`chapter chapter-${chapter.id}`}
                data-chapter={chapter.id}
                id={chapter.id}
                key={chapter.id}
              >
                {/* DA-MEDIA-01. The masked silhouette scrolls with the page; the plate
                    inside it is a real `position: fixed` layer, so the browser owns the
                    pin exactly as the cited reference does and no scroll listener can
                    fall a frame behind it. */}
                <div className="chapter-photo">
                  {/* iOS Safari's bars are translucent over the document's own paint, and
                      the fixed plate below is clipped to the window and cannot reach the
                      strips they cover. This layer can: it is ordinary document content,
                      the scroll owner parks it over the window with a bleed on each side,
                      and it carries the frame's own edge colours so the bars continue the
                      photograph instead of banding it. The plate covers it everywhere the
                      reader can actually look. */}
                  <div aria-hidden="true" className="chapter-photo-bleed" />
                  {/* The same photograph as ordinary document content, which is the only
                      kind of layer that reaches the strips iOS Safari draws its bars over.
                      The plate below covers it everywhere the reader can actually look, so
                      it is only ever seen through a browser bar. */}
                  <div aria-hidden="true" className="chapter-photo-mirror">
                    <div className="chapter-photo-mirror-frame">
                      <ChapterPhoto chapter={chapter} decorative eager={index === 0} />
                    </div>
                  </div>
                  <div className="chapter-photo-pin">
                    {/* Each source carries its own intrinsic box: the SP and 2560 crops
                        do not share the default aspect ratio, so without them the plate
                        would size the frame wrongly until the file decodes. */}
                    <ChapterPhoto chapter={chapter} eager={index === 0} />
                  </div>
                </div>
                <div className="chapter-copy">
                  <div>
                    <p className="chapter-eyebrow">MOYOY FRAGRANCE</p>
                    <p className="chapter-number">{chapter.number}</p>
                  </div>
                  <p className="chapter-prose">
                    {chapter.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </p>
                  <img
                    alt=""
                    aria-hidden="true"
                    className="chapter-product"
                    height="112"
                    src={`${assetRoot}/vector/pc-chapter-product-${chapter.id}.svg`}
                    width="130"
                  />
                </div>
                <h2>{chapter.name}</h2>
              </section>
            ))}
          </main>

          <footer data-fidelity="footer">
            <picture className="brand brand-footer">
              <source
                media="(max-width: 639px)"
                srcSet={`${assetRoot}/vector/sp-brand-footer-line.svg`}
              />
              <img
                alt=""
                aria-hidden="true"
                height="27"
                src={`${assetRoot}/vector/pc-brand-footer-line.svg`}
                width="611"
              />
            </picture>
            <div className="footer-contact">
              <p className="footer-company">{footer.company}</p>
              <p className="footer-address">{footer.address}</p>
              <p className="footer-telephone">{footer.telephone}</p>
              <p className="footer-account">{footer.account}</p>
            </div>
            <div
              className="footer-legal"
              data-policy-hidden={policyLinksHidden ? "true" : "false"}
            >
              {policyLinksHidden ? null : (
                <p className="footer-policy">
                  {footer.policyLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </p>
              )}
              <p className="footer-copyright">{footer.copyright}</p>
            </div>
            <ContourStack className="footer-contours" group="footer" />
          </footer>
        </div>
      </div>
    </SiteMenu>
  );
}
