// The text under each calculator, in Swedish and English. The calculators themselves are files from GitHub shown in a
// frame (see src/components/AppFrame.astro), and Google does not index the frame, so this text is what the page is
// found by. Facts here must match what the calculator does (2026 rules); the figures are checked against the files in
// public/app/. `about` and `how` may contain simple links (<a href>); the FAQ answers are plain text (they also go to the
// page's FAQPage data).
import type { Lang } from "@/lib/i18n";

export interface CalculatorText {
  about: string[];
  how: string[];
  faq: { q: string; a: string }[];
  related: { href: string; label: string }[];
}

export type CalculatorSlug = "ranta-pa-ranta" | "pensionssparande" | "lonevaxling" | "fire" | "nettolon" | "pensionsoversikt" | "pensionsmal";

const link = (href: string, text: string) => `<a href="${href}" class="text-primary underline underline-offset-2">${text}</a>`;

export const calculatorText: Record<CalculatorSlug, Record<Lang, CalculatorText>> = {
  "ranta-pa-ranta": {
    sv: {
      about: [
        "Ränta på ränta betyder att avkastningen du får också börjar ge avkastning. Ju längre tid pengarna får växa, desto större blir effekten, och det är därför ett jämnt månadssparande över många år kan bli ett stort belopp. Kalkylatorn visar hur ditt sparande växer år för år och hur stor del av slutbeloppet som är dina egna insättningar respektive avkastning.",
        "Du anger startkapital, månadssparande, sparhorisont och förväntad avkastning. Kalkylatorn drar också av en årlig avgift och avkastningsskatt (schablonskatten på ISK och kapitalförsäkring), så att du ser vad som faktiskt blir kvar. Vill du i stället veta vad du behöver spara för att nå ett visst mål skriver du in målet i fältet Sparmål, så räknas månadssparandet fram.",
      ],
      how: [
        "Räntan läggs på kapitalet varje månad, och avgift och skatt tas ut på kapitalet varje år.",
        "Med förinställda värden (50 000 kr i startkapital, cirka 2 500 kr i månaden i 20 år, 7 % avkastning, 0,30 % i avgift) blir slutkapitalet cirka 1,2 miljoner kronor, varav cirka 600 000 kr är egna insättningar.",
        "Tabellen År för år kan laddas ner som CSV eller Excel.",
      ],
      faq: [
        { q: "Vad är ränta på ränta?", a: "Det betyder att räntan eller avkastningen du fått läggs till kapitalet och själv börjar ge avkastning nästa period. Effekten växer ju längre du sparar." },
        { q: "Hur mycket påverkar avgiften?", a: "Även en låg avgift kostar mycket över lång tid, eftersom den minskar kapitalet som annars skulle ha gett avkastning. Prova att ändra avgiften i kalkylatorn och jämför slutkapitalet. Läs mer i artikeln om avgifter som äter upp din pension." },
        { q: "Hur räknar jag ut vad jag behöver spara för att nå en miljon?", a: "Skriv in målet, till exempel 1 000 000 kr, i fältet Sparmål. Kalkylatorn räknar då fram vilket månadssparande som krävs med din sparhorisont och avkastning." },
        { q: "Är avkastningen garanterad?", a: "Nej. Avkastningen är en förväntning som du själv väljer. Verklig avkastning varierar och kan vara lägre eller högre, och kalkylatorn är en uppskattning, inte rådgivning." },
      ],
      related: [
        { href: "/pensionskalkylator", label: "Pensionssparkalkylatorn" },
        { href: "/fire-kalkylator", label: "FIRE-kalkylatorn" },
        { href: "/artiklar/avgifter-som-ater-upp-din-pension", label: "Artikel: Avgifter som äter upp din pension" },
      ],
    },
    en: {
      about: [
        "Compound interest means that the return you earn also starts to earn a return. The longer the money has to grow, the bigger the effect, which is why steady monthly saving over many years can become a large amount. The calculator shows how your savings grow year by year and how much of the final amount is your own deposits and how much is return.",
        "You enter starting capital, monthly saving, time horizon and expected return. The calculator also deducts an annual fee and tax on the return (the standard tax on an ISK investment savings account and on capital insurance), so you see what is actually left. If you would rather know what you need to save to reach a goal, enter the goal in the Savings goal field and the monthly saving is worked out for you.",
      ],
      how: [
        "Interest is added to the capital every month, and the fee and the tax are taken from the capital every year.",
        "With the preset values (SEK 50,000 starting capital, about SEK 2,500 a month for 20 years, 7% return, 0.30% fee) the final capital is about SEK 1.2 million, of which about SEK 600,000 is your own deposits.",
        "The year-by-year table can be downloaded as CSV or Excel.",
      ],
      faq: [
        { q: "What is compound interest?", a: "It means that the interest or return you have earned is added to the capital and itself earns a return in the next period. The effect grows the longer you save." },
        { q: "How much does the fee matter?", a: "Even a low fee costs a lot over a long time, because it reduces the capital that would otherwise have earned a return. Try changing the fee in the calculator and compare the final capital. Read more in the article on fees that eat your pension." },
        { q: "How do I work out what I need to save to reach a million?", a: "Enter the goal, for example SEK 1,000,000, in the Savings goal field. The calculator then works out the monthly saving that is needed with your time horizon and return." },
        { q: "Is the return guaranteed?", a: "No. The return is an expectation that you choose yourself. The actual return varies and can be lower or higher, and the calculator is an estimate, not advice." },
      ],
      related: [
        { href: "/en/pension-savings-calculator", label: "Pension savings calculator" },
        { href: "/en/fire-calculator", label: "FIRE calculator" },
        { href: "/en/articles/fees-that-eat-your-pension", label: "Article: Fees that eat your pension" },
      ],
    },
  },

  pensionssparande: {
    sv: {
      about: [
        "Pensionssparkalkylatorn visar hur stort kapital du kan ha vid pensionen och vad det ger per månad. Du anger nuvarande pensionskapital, månadssparande, år till pension, förväntad avkastning och årlig avgift, och väljer under hur många år kapitalet ska betalas ut.",
        "Kalkylatorn gäller privat pension, IPS, tjänstepension och privat sparande, men inte allmän pension. Observera att pension vanligtvis beskattas som inkomst när den betalas ut, vilket privat sparande inte gör, eftersom skatten på det redan är betald.",
        "Inom privat sparande spelar det också roll hur kapitalet beskattas. För ISK, kapitalförsäkring och depåförsäkring betalar du en avkastningsskatt varje år. För depå, fondkonto och värdepapperskonto betalar du reavinstskatt först när du säljer, om det har uppstått en vinst.",
      ],
      how: [
        "Kapitalet växer med din förväntade avkastning efter avgift, och månadssparandet läggs till varje månad fram till pensionen.",
        "Under utbetalningstiden tas en lika stor summa ut varje månad medan resten av kapitalet fortsätter att växa. Du kan välja mellan 5 och 30 år; kortare tid än 5 år tillåts generellt inte av Skatteverket för att det ska räknas som pensionsförsäkring.",
        "Den allmänna pensionen betalas alltid ut livsvarigt. Vill du räkna med den också, använd " + link("/pensionsoversikt", "Pensionsöversikten") + ", " + link("/typfallsmodellen", "Typfallsmodellen") + " eller " + link("/pensionsplaneraren", "Pensionsplaneraren") + ".",
      ],
      faq: [
        { q: "Ingår allmän pension i kalkylatorn?", a: "Nej. Kalkylatorn gäller privat pension, IPS, tjänstepension och privat sparande. För den allmänna pensionen, använd Pensionsöversikten, Typfallsmodellen eller Pensionsplaneraren." },
        { q: "Hur lång tid kan jag få pensionen utbetald?", a: "Du kan välja mellan 5 och 30 år i kalkylatorn. Tjänstepension och privat pension kan betalas ut under en tidsbegränsad period eller livsvarigt. Kortare tid än 5 år tillåts generellt inte av Skatteverket för att det ska räknas som en pensionsförsäkring." },
        { q: "Är beloppet före eller efter skatt?", a: "Före skatt. Pension beskattas vanligtvis som inkomst när den betalas ut, så den du faktiskt får i handen blir lägre. Använd Nettolönkalkylatorn för att se skatten." },
        { q: "Hur mycket påverkar avgiften min pension?", a: "En avgift på några tiondels procent per år kan över 20-30 år minska slutkapitalet med flera procent eller mer. Kalkylatorn visar vad avgiften kostar i kronor." },
      ],
      related: [
        { href: "/ranta-pa-ranta", label: "Ränta på ränta" },
        { href: "/nettolonkalkylator", label: "Nettolönkalkylatorn" },
        { href: "/artiklar/tjanstepension-det-du-bor-veta", label: "Artikel: Tjänstepension – det du bör veta" },
      ],
    },
    en: {
      about: [
        "The pension savings calculator shows how large a capital you can have at retirement and what it gives per month. You enter your current pension capital, monthly saving, years to retirement, expected return and annual fee, and choose over how many years the capital is to be paid out.",
        "The calculator is for private pension, IPS (individual pension saving), occupational pension and private saving, but not the public pension. Note that pension is normally taxed as income when it is paid out, which private saving is not, because the tax on it has already been paid.",
        "Within private saving it also matters how the capital is taxed. For an ISK (investment savings account), a capital insurance and a securities insurance you pay a yield tax every year. For a securities account, a fund account and a custody account you pay capital gains tax only when you sell, if there has been a gain.",
      ],
      how: [
        "The capital grows with your expected return after fees, and the monthly saving is added every month until retirement.",
        "During the payout period an equal amount is withdrawn every month while the rest of the capital keeps growing. You can choose between 5 and 30 years; the Swedish Tax Agency generally does not allow less than 5 years for it to count as a pension insurance.",
        "The public pension is always paid for life. To include it as well, use the " + link("/en/pension-overview", "pension overview") + ", the " + link("/en/calculators", "Representative Case Model") + " or the " + link("/en/calculators", "retirement planner") + " (both in Swedish for now).",
      ],
      faq: [
        { q: "Is the public pension included?", a: "No. The calculator is for private pension, IPS, occupational pension and private saving. For the public pension, use the pension overview, the Representative Case Model or the retirement planner." },
        { q: "Over how long can the pension be paid out?", a: "You can choose between 5 and 30 years in the calculator. Occupational pension and private pension can be paid out over a limited period or for life. The Swedish Tax Agency generally does not allow less than 5 years for it to count as a pension insurance." },
        { q: "Is the amount before or after tax?", a: "Before tax. Pension is normally taxed as income when it is paid out, so what you actually receive is lower. Use the net salary calculator to see the tax." },
        { q: "How much does the fee affect my pension?", a: "A fee of a few tenths of a percent a year can reduce the final capital by several percent or more over 20-30 years. The calculator shows what the fee costs in kronor." },
      ],
      related: [
        { href: "/en/compound-interest", label: "Compound interest" },
        { href: "/en/net-salary", label: "Net salary calculator" },
        { href: "/en/articles/occupational-pension-what-you-should-know", label: "Article: Occupational pension, what you should know" },
      ],
    },
  },

  lonevaxling: {
    sv: {
      about: [
        "Löneväxling betyder att du avstår en del av din bruttolön mot att arbetsgivaren betalar in motsvarande belopp som pensionspremie. Kalkylatorn visar hur mycket extra pensionskapital det ger, vad ditt månadssparande blir och om löneväxling passar din lönenivå.",
        "Arbetsgivaren betalar lägre skatt på pensionspremier (särskild löneskatt 24,26 %) än på lön (arbetsgivaravgift 31,42 %). Skillnaden brukar läggas ovanpå din pensionspremie, och kalkylatorn räknar med den. Du anger lön, hur mycket du vill växla, ålder, pensionsålder och förväntad avkastning.",
      ],
      how: [
        "Du kan som mest löneväxla så att pensionssparandet blir 35 % av årslönen, dock högst 10 prisbasbelopp (592 000 kr per år 2026, prisbasbeloppet är 59 200 kr).",
        "Löneväxling är som regel bara lämpligt om månadslönen efter växling är högre än både avgiftstaket i allmän pension (cirka 56 000 kr i månaden 2026) och brytpunkten för statlig inkomstskatt (cirka 55 000 kr i månaden). Annars kan din pensionsgrundande inkomst och dina socialförsäkringsförmåner påverkas.",
        "Kalkylatorn visar också arbetsgivarens ITP1-avsättning på din lön: 4,5 % upp till 7,5 inkomstbasbelopp och 30 % på lönedelar mellan 7,5 och 30 inkomstbasbelopp.",
      ],
      faq: [
        { q: "Vad är löneväxling?", a: "Att du byter en del av din bruttolön mot en pensionspremie som arbetsgivaren betalar in. Du får lägre lön före skatt och högre pensionssparande." },
        { q: "Lönar det sig att löneväxla?", a: "Det beror på lönenivån. Det är som regel lämpligt om din lön efter växling ligger över både avgiftstaket i allmän pension och brytpunkten för statlig inkomstskatt, och då är det extra förmånligt eftersom du slipper ungefär 20 procentenheter högre marginalskatt på den växlade delen." },
        { q: "Hur mycket får jag löneväxla?", a: "Pensionssparandet får uppgå till högst 35 % av årslönen från anställningen, dock aldrig mer än 10 prisbasbelopp, 592 000 kr per år 2026. Det lägsta av gränserna avgör ditt tak." },
        { q: "Vad är särskild löneskatt?", a: "Det är den skatt arbetsgivaren betalar på pensionspremier, 24,26 %. Den är lägre än arbetsgivaravgiften på lön, 31,42 %, och skillnaden läggs ovanpå din pensionspremie." },
      ],
      related: [
        { href: "/nettolonkalkylator", label: "Nettolönkalkylatorn" },
        { href: "/pensionskalkylator", label: "Pensionssparkalkylatorn" },
        { href: "/artiklar/tjanstepension-det-du-bor-veta", label: "Artikel: Tjänstepension – det du bör veta" },
      ],
    },
    en: {
      about: [
        "Salary exchange (löneväxling) means that you give up part of your gross salary in return for your employer paying the same amount into your pension as a premium. The calculator shows how much extra pension capital this gives, what your monthly saving becomes and whether salary exchange suits your salary level.",
        "The employer pays lower tax on pension premiums (special payroll tax, 24.26%) than on salary (employer's social charges, 31.42%). The difference is usually added on top of your pension premium, and the calculator includes it. You enter salary, how much you want to exchange, age, retirement age and expected return.",
      ],
      how: [
        "You can exchange at most so that your pension saving is 35% of your annual salary, but never more than 10 price base amounts (SEK 592,000 a year in 2026; the price base amount is SEK 59,200).",
        "Salary exchange is normally only suitable if your monthly salary after the exchange is higher than both the ceiling for the public pension charge (about SEK 56,000 a month in 2026) and the threshold for state income tax (about SEK 55,000 a month). Otherwise your pensionable income and social insurance benefits can be affected.",
        "The calculator also shows the employer's ITP1 contribution on your salary: 4.5% up to 7.5 income base amounts and 30% on the parts of the salary between 7.5 and 30 income base amounts.",
      ],
      faq: [
        { q: "What is salary exchange?", a: "It means swapping part of your gross salary for a pension premium that your employer pays in. You get a lower salary before tax and a higher pension saving." },
        { q: "Is salary exchange worth it?", a: "It depends on your salary level. It is normally suitable if your salary after the exchange is above both the ceiling for the public pension charge and the threshold for state income tax, and then it is especially favourable because you avoid about 20 percentage points higher marginal tax on the exchanged part." },
        { q: "How much can I exchange?", a: "Pension saving may be at most 35% of your annual salary from the employment, but never more than 10 price base amounts, SEK 592,000 a year in 2026. The lower of the limits sets your ceiling." },
        { q: "What is special payroll tax?", a: "It is the tax the employer pays on pension premiums, 24.26%. It is lower than the employer's social charges on salary, 31.42%, and the difference is added on top of your pension premium." },
      ],
      related: [
        { href: "/en/net-salary", label: "Net salary calculator" },
        { href: "/en/pension-savings-calculator", label: "Pension savings calculator" },
        { href: "/en/articles/occupational-pension-what-you-should-know", label: "Article: Occupational pension, what you should know" },
      ],
    },
  },

  fire: {
    sv: {
      about: [
        "FIRE står för Financial Independence, Retire Early: att spara och investera tills avkastningen räcker att leva på. Kalkylatorn visar vid vilken ålder du når målet, utifrån din lön, hur stor del du sparar och vilken avkastning du räknar med.",
        "Målet är dina årsutgifter gånger FIRE-multipeln. Med multipeln 25 kan du ta ut 4 % av portföljen per år, den så kallade 4 %-regeln. Kalkylatorn drar också av avgifter och schablonskatt på ISK och kapitalförsäkring, så att du ser avkastningen efter kostnader.",
      ],
      how: [
        "Du sparar samma belopp varje månad. Skatt och avgifter dras på portföljens värde i slutet av varje år. Skatten tas bara ut på det som överstiger det skattefria beloppet, som från 2026 är 300 000 kr totalt för ISK, kapitalförsäkring och PEPP-konto.",
        "Lön, utgifter och mål räknas i dagens kronor, utan inflation. Ange därför gärna avkastningen efter inflation.",
        "Med de förinställda värdena (20 år, 40 000 kr i månadslön efter skatt, sparkvot 50 %, avkastning 6,1 %) når du målet 6 000 000 kr vid 37 års ålder. Du kan ladda ner tabellen som CSV eller Excel.",
      ],
      faq: [
        { q: "Vad är FIRE?", a: "Financial Independence, Retire Early: att spara och investera så mycket att avkastningen räcker för att leva på, så att du inte behöver arbeta för pengarna." },
        { q: "Vad är 4 %-regeln?", a: "Regeln säger att du kan ta ut 4 % av portföljen varje år och leva på det. Det motsvarar att portföljen är 25 gånger dina årsutgifter, vilket är kalkylatorns förinställda FIRE-multipel." },
        { q: "Hur påverkar sparkvoten?", a: "Mycket. En högre sparkvot gör både att du sparar mer och att dina utgifter, och därmed målet, blir lägre. Prova att ändra sparkvoten och se hur FIRE-åldern flyttas." },
        { q: "Är resultatet säkert?", a: "Nej. Avkastningen är inte garanterad och verkliga marknader varierar. Resultatet är en uppskattning, inte finansiell rådgivning." },
      ],
      related: [
        { href: "/ranta-pa-ranta", label: "Ränta på ränta" },
        { href: "/pensionsoversikt", label: "Pensionsöversikten" },
        { href: "/artiklar/sa-funkar-fire-vagen-till-ekonomisk-frihet", label: "Artikel: Så funkar FIRE" },
      ],
    },
    en: {
      about: [
        "FIRE stands for Financial Independence, Retire Early: saving and investing until the return is enough to live on. The calculator shows at what age you reach the target, based on your salary, how much of it you save and the return you expect.",
        "The target is your yearly spending times the FIRE multiple. With a multiple of 25 you can take out 4% of the portfolio a year, the so-called 4% rule. The calculator also deducts fees and the standard tax on ISK and capital insurance, so you see the return after costs.",
      ],
      how: [
        "You save the same amount every month. Tax and fees are taken on the value of the portfolio at the end of every year. The tax is only paid on what is above the tax-free amount, which from 2026 is SEK 300,000 in total for ISK, capital insurance and PEPP accounts.",
        "Salary, spending and target are in today's kronor, without inflation. So enter the return after inflation.",
        "With the preset values (age 20, SEK 40,000 a month after tax, savings rate 50%, return 6.1%) you reach the target of SEK 6,000,000 at age 37. You can download the table as CSV or Excel.",
      ],
      faq: [
        { q: "What is FIRE?", a: "Financial Independence, Retire Early: saving and investing so much that the return is enough to live on, so that you do not have to work for the money." },
        { q: "What is the 4% rule?", a: "The rule says you can take out 4% of the portfolio every year and live on it. That corresponds to the portfolio being 25 times your yearly spending, which is the calculator's preset FIRE multiple." },
        { q: "How does the savings rate matter?", a: "A lot. A higher savings rate means both that you save more and that your spending, and so the target, is lower. Try changing the savings rate and see how the FIRE age moves." },
        { q: "Is the result certain?", a: "No. The return is not guaranteed and real markets vary. The result is an estimate, not financial advice." },
      ],
      related: [
        { href: "/en/compound-interest", label: "Compound interest" },
        { href: "/en/pension-overview", label: "Pension overview" },
        { href: "/en/articles/how-fire-works-the-way-to-financial-freedom", label: "Article: How FIRE works" },
      ],
    },
  },

  nettolon: {
    sv: {
      about: [
        "Nettolönkalkylatorn visar vad som blir kvar av din bruttolön efter skatt 2026, steg för steg. Du anger bruttolön, kommunalskattesats och eventuellt bruttolöneavdrag (till exempel löneväxling), och kan lägga till pension, kyrkoavgift, begravningsavgift, kapitalinkomster, ränteutgifter, ROT- och RUT-avdrag och fastighetsavgift.",
        "Beräkningen följer Skatteverkets tekniska beskrivning för inkomståret 2026: grundavdrag, kommunalskatt, statlig skatt, jobbskatteavdrag, allmän pensionsavgift och övriga reduktioner. Du ser också effektiv skatt, marginalskatt och hur långt du ligger från brytpunkten för statlig skatt.",
      ],
      how: [
        "Kommunalskatten räknas på den beskattningsbara inkomsten (efter grundavdrag). Genomsnittet 2026 är cirka 32,41 %, och du kan välja din kommun i listan.",
        "Statlig skatt är 20 % på den del av den beskattningsbara inkomsten som överstiger 643 000 kr. Räknat på bruttolön betalar du statlig skatt från cirka 660 400 kr per år, cirka 55 000 kr i månaden, om du är under 66 år.",
        "Jobbskatteavdraget är en skattereduktion för arbetsinkomst och kan bara räknas av mot kommunalskatten. Det ges inte på pension. Prisbasbeloppet 2026 är 59 200 kr och inkomstbasbeloppet 83 400 kr.",
        "Med de förinställda värdena (40 000 kr i bruttolön, kommunalskatt 32,4 %) blir nettolönen cirka 31 400 kr i månaden, med 21,5 % i effektiv skatt och 33,7 % i marginalskatt. Tabellen kan laddas ner som CSV eller Excel.",
      ],
      faq: [
        { q: "Hur räknar jag ut nettolön?", a: "Nettolönen är bruttolönen minus skatten. Skatten består av kommunalskatt på den beskattningsbara inkomsten, statlig skatt över skiktgränsen och eventuella avgifter, minskat med skattereduktioner som jobbskatteavdraget. Kalkylatorn gör alla stegen och visar dem i en tabell." },
        { q: "När betalar jag statlig inkomstskatt 2026?", a: "Statlig skatt är 20 % på den beskattningsbara inkomst som överstiger 643 000 kr. Räknat på bruttolön är brytpunkten cirka 660 400 kr per år, cirka 55 033 kr i månaden, för den som är under 66 år." },
        { q: "Vad är jobbskatteavdrag?", a: "En skattereduktion för den som arbetar. Den minskar kommunalskatten, men ges inte på pension. Storleken beror på arbetsinkomsten och kommunalskattesatsen." },
        { q: "Hur påverkar löneväxling nettolönen?", a: "Bruttolöneavdraget dras av före skatt och sänker därför både skatten och nettolönen. Fyll i beloppet i fältet Bruttolöneavdrag och se skillnaden. Se även Löneväxlingskalkylatorn." },
        { q: "Stämmer resultatet med lönebeskedet?", a: "Resultatet motsvarar den slutliga skatten. Preliminärskatten på lönebeskedet kan avvika något. Kalkylatorn är ett beräkningsstöd och inte skatterådgivning." },
      ],
      related: [
        { href: "/lonevaxlingskalkylator", label: "Löneväxlingskalkylatorn" },
        { href: "/pensionsoversikt", label: "Pensionsöversikten" },
        { href: "/nyheter/inkomstbasbelopp-2027", label: "Nyhet: Inkomstbasbelopp 2027" },
      ],
    },
    en: {
      about: [
        "The net salary calculator shows what is left of your gross salary after tax in 2026, step by step. You enter gross salary, municipal tax rate and any gross salary deduction (for example salary exchange), and can add pension, church fee, funeral fee, capital income, interest expenses, ROT and RUT deductions and property fee.",
        "The calculation follows the Swedish Tax Agency's technical description for income year 2026: basic allowance, municipal tax, state tax, earned income tax credit, general pension charge and other reductions. You also see effective tax, marginal tax and how far you are from the threshold for state tax.",
      ],
      how: [
        "Municipal tax is calculated on the taxable income (after the basic allowance). The average in 2026 is about 32.41%, and you can choose your municipality in the list.",
        "State tax is 20% on the part of the taxable income above SEK 643,000. Counted on gross salary, you pay state tax from about SEK 660,400 a year, about SEK 55,000 a month, if you are under 66.",
        "The earned income tax credit (jobbskatteavdrag) is a tax reduction for earned income and can only be set off against municipal tax. It is not given on pension. The price base amount for 2026 is SEK 59,200 and the income base amount is SEK 83,400.",
        "With the preset values (SEK 40,000 gross salary, municipal tax 32.4%) the net salary is about SEK 31,400 a month, with 21.5% effective tax and 33.7% marginal tax. The table can be downloaded as CSV or Excel.",
      ],
      faq: [
        { q: "How do I work out net salary?", a: "Net salary is gross salary minus tax. The tax consists of municipal tax on the taxable income, state tax above the bracket limit and any fees, reduced by tax reductions such as the earned income tax credit. The calculator does all the steps and shows them in a table." },
        { q: "When do I pay state income tax in 2026?", a: "State tax is 20% on the taxable income above SEK 643,000. Counted on gross salary the threshold is about SEK 660,400 a year, about SEK 55,033 a month, for someone under 66." },
        { q: "What is the earned income tax credit?", a: "A tax reduction for people who work. It reduces municipal tax, but is not given on pension. Its size depends on the earned income and the municipal tax rate." },
        { q: "How does salary exchange affect net salary?", a: "The gross salary deduction is taken off before tax and so lowers both the tax and the net salary. Enter the amount in the Gross salary deduction field and see the difference. See also the salary exchange calculator." },
        { q: "Does the result match my pay slip?", a: "The result corresponds to the final tax. The preliminary tax on the pay slip can differ slightly. The calculator is a calculation aid and not tax advice." },
      ],
      related: [
        { href: "/en/salary-exchange", label: "Salary exchange calculator" },
        { href: "/en/pension-overview", label: "Pension overview" },
        { href: "/en/news/income-base-amount-2027", label: "News: Income base amount 2027" },
      ],
    },
  },

  pensionsoversikt: {
    sv: {
      about: [
        "Pensionsöversikten visar om din pension och ditt sparande räcker till den ekonomi du vill ha som pensionär, och vad som behövs om det inte gör det. Du svarar på några frågor: ålder, lön, sparat kapital, månadssparande, när du vill gå i pension, vad du behöver per månad efter skatt och vilken avkastning du räknar med.",
        "Den allmänna pensionen (inkomstpension och premiepension) och tjänstepensionen räknas med Pensionsmyndighetens Typfallsmodellen utifrån din lön, din ålder och när du började arbeta. Har du ditt eget besked från minPension kan du skriva in beloppen i stället.",
      ],
      how: [
        "Kalkylatorn visar ditt kapital fram till 95 års ålder, din inkomst som pensionär per månad efter skatt och en prognos: om pensionen och sparandet räcker, hur stort kapitalöverskottet eller underskottet är och hur mycket mer du behöver spara varje månad.",
        "Den visar också vid vilken ålder du uppskattningsvis kan gå i pension med samma budget, sparande och avkastning, eller hur länge du behöver arbeta om det inte räcker.",
        "Allt räknas i dagens penningvärde. Under Fler detaljer kan du ändra bland annat kommun, tjänstepensionsavtal, annan inkomst och livslängd, och under Våra antaganden inflation, löneökning och avgifter.",
      ],
      faq: [
        { q: "Räcker min pension?", a: "Det beror på vad du vill ha att leva på. Pensionsöversikten jämför din pension efter skatt och ditt sparande med en budget som du väljer eller skriver in, och visar prognosen i klartext." },
        { q: "Vad är riktåldern?", a: "Riktåldern är en vägledande pensionsålder som Pensionsmyndigheten räknar fram för varje årskull utifrån hur länge vi förväntas leva. Den är högre för dem som är yngre. Kalkylatorn visar din riktålder." },
        { q: "Hur beräknas den allmänna pensionen?", a: "Med Pensionsmyndighetens Typfallsmodell, utifrån din lön, din ålder och när du började arbeta. Du kan också skriva in beloppen från ditt eget besked på minPension." },
        { q: "Kan jag gå i pension tidigare?", a: "Kalkylatorn visar vid vilken ålder dina pengar uppskattningsvis räcker med samma budget, sparande och avkastning. Resultatet är en uppskattning och inte rådgivning." },
      ],
      related: [
        { href: "/pensionsmalkalkylatorn", label: "Pensionsmålkalkylatorn" },
        { href: "/pensionsplaneraren", label: "Pensionsplaneraren" },
        { href: "/artiklar/sa-fungerar-din-allmanna-pension", label: "Artikel: Så fungerar din allmänna pension" },
      ],
    },
    en: {
      about: [
        "The pension overview shows whether your pension and savings are enough for the lifestyle you want as a pensioner, and what is needed if they are not. You answer a few questions: age, salary, capital saved, monthly saving, when you want to retire, what you need per month after tax and the return you expect.",
        "The public pension (income pension and premium pension) and the occupational pension are calculated with the Swedish Pensions Agency's Representative Case Model (Typfallsmodellen), based on your salary, your age and when you started working. If you have your own statement from minPension you can enter the amounts instead.",
      ],
      how: [
        "The calculator shows your capital up to age 95, your income as a pensioner per month after tax and a forecast: whether the pension and savings are enough, how large the capital surplus or shortfall is and how much more you need to save every month.",
        "It also shows at what age you can roughly retire with the same budget, saving and return, or how long you need to work if it is not enough.",
        "Everything is in today's money. Under More details you can change, among other things, municipality, occupational pension agreement, other income and life expectancy, and under Our assumptions inflation, wage growth and fees.",
      ],
      faq: [
        { q: "Will my pension be enough?", a: "It depends on what you want to live on. The pension overview compares your pension after tax and your savings with a budget that you choose or enter, and shows the forecast in plain words." },
        { q: "What is the guide age (riktålder)?", a: "The guide age is a guiding retirement age that the Swedish Pensions Agency works out for each birth cohort based on how long we are expected to live. It is higher for younger people. The calculator shows your guide age." },
        { q: "How is the public pension calculated?", a: "With the Swedish Pensions Agency's Representative Case Model, based on your salary, your age and when you started working. You can also enter the amounts from your own statement on minPension." },
        { q: "Can I retire earlier?", a: "The calculator shows at what age your money roughly lasts with the same budget, saving and return. The result is an estimate and not advice." },
      ],
      related: [
        { href: "/en/replacement-rate-calculator", label: "Replacement rate calculator" },
        { href: "/en/calculators", label: "Retirement planner (in Swedish for now)" },
        { href: "/en/articles/how-your-public-pension-works", label: "Article: How your public pension works" },
      ],
    },
  },

  pensionsmal: {
    sv: {
      about: [
        "Pensionsmålkalkylatorn räknar ut hur mycket du behöver spara, varje månad eller som ett engångsbelopp, för att nå den pensionsnivå du vill ha. Du anger din lön, den pension du får enligt prognosen (kompensationsgraden hittar du på minPension) och den pensionsnivå du vill ha som andel av lönen.",
        "Kalkylatorn visar hur stor del av den önskade inkomsten som saknas och hur mycket du behöver spara för att täcka det, med din sparhorisont, dina utbetalningsår och din avkastning. Du kan räkna före eller efter inkomstskatt. Skatten på pensionen räknas enligt Pensionsmyndighetens Typfallsmodellen.",
      ],
      how: [
        "Förinställt räknar kalkylatorn med att prognosen ger 70 % av lönen och att du vill ha 80 %, och visar gapet mellan dem.",
        "Du väljer kommun för kommunalskatten 2026 (statlig skatt tillkommer över skiktgränsen), och anger hur många år det är till pensionen och under hur många år kapitalet ska betalas ut.",
        "Vill du se hela bilden med allmän pension och tjänstepension, använd " + link("/pensionsoversikt", "Pensionsöversikten") + " eller " + link("/typfallsmodellen", "Typfallsmodellen") + ".",
      ],
      faq: [
        { q: "Vad är kompensationsgrad?", a: "Kompensationsgraden är hur stor del av din slutlön före skatt som pensionen ger enligt prognosen. Du hittar den på minPension." },
        { q: "Hur mycket pension vill jag ha?", a: "Många räknar med runt 70-80 % av slutlönen före skatt, men det beror på dina utgifter. Prova olika nivåer i kalkylatorn och se hur mycket mer du behöver spara." },
        { q: "Ska jag räkna före eller efter skatt?", a: "Du kan välja i kalkylatorn. Före skatt jämför du med lönen före skatt, efter skatt visar kalkylatorn vad som blir kvar i handen efter inkomstskatt på pensionen." },
        { q: "Är resultatet säkert?", a: "Nej. Det är en uppskattning som bygger på de värden du anger, och avkastningen är inte garanterad. Det är inte individuell rådgivning." },
      ],
      related: [
        { href: "/pensionsoversikt", label: "Pensionsöversikten" },
        { href: "/pensionskalkylator", label: "Pensionssparkalkylatorn" },
        { href: "/artiklar/uttagsstrategi-nar-pensionen-borjar", label: "Artikel: Uttagsstrategi när pensionen börjar" },
      ],
    },
    en: {
      about: [
        "The replacement rate calculator works out how much you need to save, every month or as a lump sum, to reach the pension level you want. You enter your salary, the pension you get according to the forecast (the replacement rate, kompensationsgrad, is on minPension) and the pension level you want as a share of your salary.",
        "The calculator shows how much of the income you want is missing and how much you need to save to cover it, with your time horizon, payout years and return. You can calculate before or after income tax. Tax on the pension follows the Swedish Pensions Agency's Representative Case Model.",
      ],
      how: [
        "By default the calculator assumes that the forecast gives 70% of your salary and that you want 80%, and shows the gap between them.",
        "You choose your municipality for the 2026 municipal tax (state tax is added above the bracket limit), and enter how many years it is to retirement and over how many years the capital is to be paid out.",
        "To see the whole picture with public pension and occupational pension, use the " + link("/en/pension-overview", "pension overview") + ".",
      ],
      faq: [
        { q: "What is the replacement rate (kompensationsgrad)?", a: "The replacement rate is how much of your final salary before tax the pension gives according to the forecast. You find it on minPension." },
        { q: "How much pension do I want?", a: "Many people count on around 70-80% of their final salary before tax, but it depends on your spending. Try different levels in the calculator and see how much more you need to save." },
        { q: "Should I calculate before or after tax?", a: "You can choose in the calculator. Before tax you compare with the salary before tax; after tax the calculator shows what is left in your hand after income tax on the pension." },
        { q: "Is the result certain?", a: "No. It is an estimate based on the values you enter, and the return is not guaranteed. It is not individual advice." },
      ],
      related: [
        { href: "/en/pension-overview", label: "Pension overview" },
        { href: "/en/pension-savings-calculator", label: "Pension savings calculator" },
        { href: "/en/articles/withdrawal-strategy-getting-the-most-from-your-pension", label: "Article: Withdrawal strategy" },
      ],
    },
  },
};
