import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-serif text-lg font-semibold text-primary">Pensionslyft</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Oberoende guider och kalkyler om svensk pension. Vi ger allmän information, inte
            individuell finansiell rådgivning.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-foreground">Innehåll</p>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              <Link to="/artiklar">Artiklar</Link>
            </li>
            <li>
              <Link to="/pensionskalkylator">Pensionskalkylator</Link>
            </li>
            <li>
              <Link to="/ranta-pa-ranta">Ränta på ränta</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium text-foreground">Konto</p>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              <Link to="/auth">Logga in</Link>
            </li>
            <li>
              <Link to="/konto">Mitt konto</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pensionslyft. Alla belopp är uppskattningar.
      </div>
    </footer>
  );
}
