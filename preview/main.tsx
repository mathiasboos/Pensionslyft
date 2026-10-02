// Local preview of the Framer components. Run with `npm run preview`.
import { StrictMode, type JSX } from "react";
import { createRoot } from "react-dom/client";
import Pensionskalkylator from "../framer/Pensionskalkylator.tsx";
import RantaPaRanta from "../framer/RantaPaRanta.tsx";

type AnyProps = Record<string, never>;
const Pension = Pensionskalkylator as unknown as (props: AnyProps) => JSX.Element;
const Compound = RantaPaRanta as unknown as (props: AnyProps) => JSX.Element;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main>
      <section id="pensionskalkylator">
        <Pension />
      </section>
      <section id="ranta-pa-ranta">
        <Compound />
      </section>
    </main>
  </StrictMode>,
);
