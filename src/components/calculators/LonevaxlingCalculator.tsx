// Löneväxlingskalkylatorn (/lonevaxlingskalkylator): the page of the supplied Salary_Exchange_Consumer.html
// (github.com/mathiasboos/Calculators), with the same texts, controls and results. The look is in
// src/styles/lonevaxling.css and the calculation in src/lib/lonevaxling.ts.
import { type CSSProperties, useRef, useState } from "react";
import {
  AG_PCT,
  ALDER,
  AVKASTNING,
  BELOPP,
  calcLonevaxling,
  clamp,
  disclaimer,
  fillPercent,
  fmtInt,
  fmtKr,
  fmtOneDecimal,
  fmtRate,
  fmtText,
  fmtUplift,
  IBB,
  ITP1_GRENS1,
  ITP1_GRENS2,
  LIMIT_AVGIFTSTAK,
  LIMIT_BRYTPUNKT,
  limitBelopp,
  LON,
  MAX_SPARANDE_PBB,
  MAX_SPARANDE_PROCENT,
  maxVaxling,
  parseNum,
  PBB,
  PENSIONSALDER,
  SLP_PCT,
  YEAR,
} from "@/lib/lonevaxling";
import LonevaxlingChart from "./LonevaxlingChart";

const STATUS_ICON = { good: "✓", amber: "!", warn: "✕" } as const;

const SOURCE_URL =
  "https://www.pensionsmyndigheten.se/forsta-din-pension/om-pensionssystemet/sa-beraknas-din-pension-basbelopp-berakningsfaktorer-och-varderegler";

/** The green part of a slider, which the stylesheet reads. */
const fill = (value: number, min: number, max: number) =>
  ({ "--lv-fill": `${fillPercent(value, min, max)}%` }) as CSSProperties;

/** A small "i" that explains something when it is hovered or focused. */
function Info({ tip, style }: { tip: string; style?: CSSProperties }) {
  return (
    <span className="info" tabIndex={0} role="img" aria-label={tip} data-tip={tip} style={style}>
      i
    </span>
  );
}

export default function LonevaxlingCalculator() {
  const [lon, setLon] = useState<number>(LON.start);
  const [belopp, setBelopp] = useState<number>(BELOPP.start);
  const [alder, setAlder] = useState<number>(ALDER.start);
  const [pensionsalder, setPensionsalder] = useState<number>(PENSIONSALDER.start);
  const [avkastning, setAvkastning] = useState<number>(AVKASTNING.start);

  // What is typed in the two number fields counts when the field is left or Enter is pressed
  const [lonText, setLonText] = useState(fmtInt(LON.start));
  const [beloppText, setBeloppText] = useState(fmtInt(BELOPP.start));
  const lonEdited = useRef(false);
  const beloppEdited = useRef(false);

  const tak = maxVaxling(lon);
  const result = calcLonevaxling({ lon, belopp, alder, pensionsalder, avkastning });

  // The salary decides the cap, and the exchanged amount cannot be above it
  const applyLon = (value: number) => {
    setLon(value);
    setLonText(fmtInt(value));
    const limited = limitBelopp(value, belopp);
    if (limited !== belopp) {
      setBelopp(limited);
      setBeloppText(fmtInt(limited));
    }
  };
  const applyBelopp = (value: number) => {
    const limited = limitBelopp(lon, value);
    setBelopp(limited);
    setBeloppText(fmtInt(limited));
  };

  const commitLon = () => {
    const value = parseNum(lonText);
    applyLon(Number.isNaN(value) ? lon : clamp(value, 0, LON.typedMax));
  };
  const commitBelopp = () => {
    const value = parseNum(beloppText);
    applyBelopp(Number.isNaN(value) ? belopp : clamp(value, 0, BELOPP.typedMax));
  };

  // The pension age is always after the age
  const applyAlder = (value: number) => {
    setAlder(value);
    if (pensionsalder <= value) setPensionsalder(value + 1);
  };
  const applyPensionsalder = (value: number) => setPensionsalder(value <= alder ? alder + 1 : value);

  const beloppMax = Math.max(tak, BELOPP.min);

  return (
    <div className="lv">
      <div className="page">
        {/* ===== HERO: Ränta på ränta ===== */}
        <div className="hero">
          <div className="hero-eyebrow">{`Löneväxlingskalkylator ${YEAR}`}</div>
          <h1>Så växer pengarna – månaden du börjar</h1>
          <p className="hero-sub">
            Ränta på ränta gör att varje krona du löneväxlar idag är värd mer än en krona imorgon. Dra i reglagen
            nedan och se effekten direkt.
          </p>
          <LonevaxlingChart premie={result.premie} years={result.years} avkastning={avkastning} />
        </div>

        {/* ===== KALKYLATOR ===== */}
        <div className="wrap">
          <div className="calc-grid">
            {/* Vänster: inputs */}
            <div className="card">
              <div className="section-label">Dina uppgifter</div>

              <div className="field">
                <div className="field-head">
                  <label htmlFor="lonNum">Månadslön före skatt</label>
                  <span className="inbox">
                    <input
                      type="text"
                      id="lonNum"
                      inputMode="numeric"
                      aria-label="Månadslön i kronor"
                      value={lonText}
                      onChange={(e) => {
                        lonEdited.current = true;
                        setLonText(e.target.value);
                      }}
                      onBlur={() => {
                        if (lonEdited.current) commitLon();
                        else setLonText(fmtInt(lon));
                        lonEdited.current = false;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && lonEdited.current) {
                          commitLon();
                          lonEdited.current = false;
                        }
                      }}
                    />
                    <span className="unit">kr</span>
                  </span>
                </div>
                <input
                  type="range"
                  id="lonSlider"
                  min={LON.min}
                  max={LON.max}
                  step={LON.step}
                  value={clamp(lon, LON.min, LON.max)}
                  style={fill(lon, LON.min, LON.max)}
                  aria-label="Månadslön före skatt"
                  onChange={(e) => applyLon(+e.target.value)}
                />
              </div>

              <div className="field">
                <div className="field-head">
                  <label htmlFor="beloppNum">Hur mycket vill du löneväxla?</label>
                  <span className="inbox">
                    <input
                      type="text"
                      id="beloppNum"
                      inputMode="numeric"
                      aria-label="Växlat belopp"
                      value={beloppText}
                      onChange={(e) => {
                        beloppEdited.current = true;
                        setBeloppText(e.target.value);
                      }}
                      onBlur={() => {
                        if (beloppEdited.current) commitBelopp();
                        else setBeloppText(fmtInt(belopp));
                        beloppEdited.current = false;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && beloppEdited.current) {
                          commitBelopp();
                          beloppEdited.current = false;
                        }
                      }}
                    />
                    <span className="unit">kr/mån</span>
                  </span>
                </div>
                <input
                  type="range"
                  id="beloppSlider"
                  min={BELOPP.min}
                  max={beloppMax}
                  step={BELOPP.step}
                  value={clamp(belopp, BELOPP.min, beloppMax)}
                  style={fill(clamp(belopp, BELOPP.min, beloppMax), BELOPP.min, beloppMax)}
                  aria-label="Löneväxlat belopp per månad"
                  onChange={(e) => applyBelopp(+e.target.value)}
                />
                <div className="hint">
                  Tak för löneväxling: <b>{` ${fmtInt(tak)} kr/mån `}</b>
                  <Info
                    tip={`Pensionssparande får uppgå till max ${MAX_SPARANDE_PROCENT} % av årslönen, dock högst 10 prisbasbelopp (${fmtText(MAX_SPARANDE_PBB)} kr/år). Det lägsta av dessa gränser avgör ditt tak.`}
                  />
                </div>
              </div>

              <div className="field">
                <div className="field-head">
                  <label htmlFor="alderSlider">Din ålder</label>
                  <span className="val-only">{`${alder} år`}</span>
                </div>
                <input
                  type="range"
                  id="alderSlider"
                  min={ALDER.min}
                  max={ALDER.max}
                  step={1}
                  value={alder}
                  style={fill(alder, ALDER.min, ALDER.max)}
                  aria-label="Din ålder"
                  onChange={(e) => applyAlder(+e.target.value)}
                />
              </div>

              <div className="field">
                <div className="field-head">
                  <label htmlFor="pensionsalderSlider">Planerad pensionsålder</label>
                  <span className="val-only">{`${pensionsalder} år`}</span>
                </div>
                <input
                  type="range"
                  id="pensionsalderSlider"
                  min={PENSIONSALDER.min}
                  max={PENSIONSALDER.max}
                  step={1}
                  value={pensionsalder}
                  style={fill(pensionsalder, PENSIONSALDER.min, PENSIONSALDER.max)}
                  aria-label="Pensionsålder"
                  onChange={(e) => applyPensionsalder(+e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <div className="field-head">
                  <label htmlFor="avkastningSlider">Förväntad avkastning per år</label>
                  <span className="val-only">{`${fmtOneDecimal(avkastning)} %`}</span>
                </div>
                <input
                  type="range"
                  id="avkastningSlider"
                  min={AVKASTNING.min}
                  max={AVKASTNING.max}
                  step={AVKASTNING.step}
                  value={avkastning}
                  style={fill(avkastning, AVKASTNING.min, AVKASTNING.max)}
                  aria-label="Förväntad avkastning"
                  onChange={(e) => setAvkastning(+e.target.value)}
                />
              </div>
            </div>

            {/* Höger: resultat */}
            <div className="result-box">
              {/* Hjältekort */}
              <div className="r-hero">
                <div className="r-lbl">Ditt månadssparande</div>
                <div className="r-num">{fmtKr(result.premie)}</div>
                <div className="r-sub">
                  Inklusive <b>{fmtUplift(result.uplift)}</b> som
                  arbetsgivaren skjuter till{" "}
                  <Info
                    style={{ color: "#fff", borderColor: "#fff", opacity: 0.55 }}
                    tip={`Arbetsgivaren betalar lägre löneskatt på pensionspremier (${fmtRate(SLP_PCT)} %) än arbetsgivaravgift på lön (${fmtRate(AG_PCT)} %). Skillnaden läggs ovanpå din pensionspremie.`}
                  />
                </div>
                <hr />
                <div className="r-lbl">
                  Förväntat extra pensionskapital om <span>{result.years}</span> år
                </div>
                <div className="r-num">{fmtKr(result.kapital)}</div>
                <div className="r-foot">{disclaimer(avkastning)}</div>
              </div>

              {/* Lämplighetsindikator */}
              <div className={`status ${result.suitability}`}>
                <div className="s-icon">{STATUS_ICON[result.suitability]}</div>
                <div>
                  <b>{result.title}</b>
                  <span>{result.text}</span>
                </div>
              </div>

              <div className="panel">
                <b>Vill du börja löneväxla?</b>
                <p>Prata med din arbetsgivare för att ta reda på om de erbjuder löneväxling och hur upplägget ser ut.</p>
              </div>

              <div className="tip">
                <span className="bulb" aria-hidden="true">
                  💡
                </span>
                <span>
                  Erbjuder inte din arbetsgivare löneväxling? Då kan ett eget månadssparande i kapitalförsäkring eller
                  ISK vara ett alternativ.
                </span>
              </div>
            </div>
          </div>

          {/* Gränsvärden */}
          <div className="rules">
            <h2>När är löneväxling lämpligt?</h2>
            <p>
              Löneväxling är som regel bara lämpligt om din månadslön <b>efter växling</b> överstiger båda gränserna
              nedan. Annars kan din pensionsgrundande inkomst och socialförsäkringsförmåner påverkas.
            </p>
            <div className="limits">
              <div className="limit">
                <div className="ln">{fmtText(LIMIT_AVGIFTSTAK)} kr/mån</div>
                <div className="lt">
                  Avgiftstaket i allmän pension. Under denna nivå minskar din intjäning till allmän pension.
                </div>
              </div>
              <div className="limit">
                <div className="ln">{fmtText(LIMIT_BRYTPUNKT)} kr/mån</div>
                <div className="lt">
                  Brytpunkten för statlig inkomstskatt. Över denna nivå är marginalskatten ~20 % högre – löneväxling är
                  extra förmånlig.
                </div>
              </div>
              <div className="limit">
                <div className="ln">{`Max ${MAX_SPARANDE_PROCENT} % av lön`}</div>
                <div className="lt">
                  {`Pensionssparande får uppgå till högst ${MAX_SPARANDE_PROCENT} % av din årslön från anställningen, dock aldrig mer än 10 prisbasbelopp (${fmtText(MAX_SPARANDE_PBB)} kr/år = ${fmtText(MAX_SPARANDE_PBB / 12)} kr/mån, PBB ${YEAR}: ${fmtText(PBB)} kr).`}
                </div>
              </div>
            </div>
            <p>
              <b>Arbetsgivarens ITP1-avsättning på din lön</b>
            </p>
            <div className="limits">
              <div className="limit">
                <div className="ln">4,5 % upp till 7,5 IBB</div>
                <div className="lt">
                  {`På lönedelar upp till 7,5 inkomstbasbelopp (${fmtText(ITP1_GRENS1)} kr/mån, IBB ${YEAR}: ${fmtText(IBB)} kr) sätter arbetsgivaren in 4,5 %.`}
                </div>
              </div>
              <div className="limit">
                <div className="ln">30 % mellan 7,5–30 IBB</div>
                <div className="lt">
                  {`På lönedelar mellan 7,5 och 30 IBB (${fmtText(ITP1_GRENS1)}–${fmtText(ITP1_GRENS2)} kr/mån) sätter arbetsgivaren in 30 %. Över 30 IBB görs ingen avsättning.`}
                </div>
              </div>
            </div>
            <p>
              Källa:{" "}
              <a href={SOURCE_URL} target="_blank" rel="noopener">
                Pensionsmyndigheten
              </a>
              .
            </p>
          </div>
        </div>

        <footer>
          {`Kalkylatorn är ett förenklat beräkningsverktyg och utgör inte finansiell rådgivning. Beräkningarna bygger på arbetsgivaravgift ${fmtRate(AG_PCT)} % och särskild löneskatt ${fmtRate(SLP_PCT)} %. Historisk avkastning är inte en garanti för framtida avkastning.`}
        </footer>
      </div>
    </div>
  );
}
