# Extract the tables the typfall engine needs from the parsed workbook (sheets.json).
import json, math
s = json.load(open("sheets.json"))
NT = s["Några tal"]["cells"]; NY = s["Nyckeltal"]["cells"]; KS = s["K_skatt"]["cells"]
AIP = s["arv IP"]["cells"]; APP = s["arv PP"]["cells"]; MO = s["mortality"]["cells"]

def v(cells, a):
    c = cells.get(a)
    return None if c is None else c["v"]
def n2col(n):
    r = ""
    while n: n, m = divmod(n - 1, 26); r = chr(65 + m) + r
    return r
def num(x):
    if x is None or x == "": return None
    if isinstance(x, (int, float)): 
        # Keep full double precision but drop float noise like 0.30000000000000004
        return float(repr(x)) if isinstance(x, float) else x
    return None  # text cells ("Kvar att kolla", "..")

FIRST, LAST_HARD = 1957, 2026
years = list(range(FIRST, LAST_HARD + 1))
row = lambda y: y - 1957 + 4  # Några tal: 1957 -> row 4
idx = {k: [] for k in ["KPIj","KPI","PBB","MPGI","IBB","FPB","Iindex","balanstal","Bindex","Pindex","ipAvg","ppAvg","yield","rgk","taxLimit1"]}
cols = {"KPIj":"B","KPI":"C","PBB":"E","MPGI":"F","IBB":"G","FPB":"H","Iindex":"I","balanstal":"J","Bindex":"K","Pindex":"L","ipAvg":"N","ppAvg":"O","yield":"Q","rgk":"S","taxLimit1":"AC"}
for y in years:
    for k, c in cols.items():
        idx[k].append(num(v(NT, f"{c}{row(y)}")))
# Model-input dependent cells are recomputed by the engine, so blank them here:
for k, fromYear in [("yield", 2026), ("rgk", 2025)]:
    for i, y in enumerate(years):
        if y >= fromYear: idx[k][i] = None

# Kommunal skattesats (B) and begravningsavgift (H), percent -> fraction, by year 1930..2026
ks_years = list(range(1930, LAST_HARD + 1))
kom = [num(v(KS, f"B{y-1930+2}")) for y in ks_years]
beg = [num(v(KS, f"H{y-1930+2}")) for y in ks_years]

COH = range(1959, 2006)
cohorts = {}
# Mortality table P:Z rows: cohort-major, then age 61..105, then sex 0..2.
mort = {}
r = 2
while True:
    cohort = v(MO, f"S{r}")
    if cohort in (None, 0): break
    if v(MO, f"Q{r}") == 0:
        mort[(int(cohort), int(v(MO, f"R{r}")))] = (num(v(MO, f"T{r}")), num(v(MO, f"U{r}")))
    r += 1
print("mortality rows read:", r - 2, "unisex cells:", len(mort))

for c in COH:
    nrow = c - 1938 + 5  # Nyckeltal cohort row
    dIPn = [num(v(NY, f"{n2col(4 + a - 61)}{nrow}")) for a in range(61, 83)]
    dPPn = [num(v(NY, f"{n2col(28 + a - 61)}{nrow}")) for a in range(61, 104)]
    assert v(NY, f"C{nrow}") == c and v(NY, f"AA{nrow}") == c, c
    # aDeltal_IP: Nyckeltal overridden by mortality (unisex) for cohorts >= 1958, ages <= 82
    dIP = [mort.get((c, a), (None,))[0] if (c, a) in mort else dIPn[a - 61] for a in range(61, 83)]
    mIP = [mort[(c, a)][0] if (c, a) in mort else None for a in range(61, 106)]
    # arv IP: rows 3.. = ages 17..; columns D.. = years 2000..2100 (VBA: Cells(age-17+3, year-1999+3))
    arvIP1 = [num(v(AIP, f"{n2col(c + a - 1999 + 3)}{a - 17 + 3}")) if 2000 <= c + a <= 2100 else None for a in range(17, 67)]
    arvIP2 = [num(v(AIP, f"{n2col(c + a - 1999 + 3)}{81 + a - 60}")) if 2000 <= c + a <= 2100 else None for a in range(60, 106)]
    # arv PP: Cells(age-14+2, year-1999+3) for ages < 106
    arvPP = [num(v(APP, f"{n2col(c + a - 1999 + 3)}{a - 14 + 2}")) if 2000 <= c + a <= 2100 else None for a in range(15, 106)]
    cohorts[c] = dict(dIP=dIP, dIPn=dIPn, dPPn=dPPn, mIP=mIP, arvIP1=arvIP1, arvIP2=arvIP2, arvPP=arvPP)

# Riktålder and lowest pension age per birth year (Nyckeltal DO:DR)
rikt = {}
for r in range(5, 123):
    c = v(NY, f"DO{r}")
    if isinstance(c, (int, float)):
        rikt[int(c)] = (v(NY, f"DQ{r}"), v(NY, f"DR{r}"))

out = dict(
    source="Pensionsmyndighetens typfallsmodell ver. 4.8",
    firstYear=FIRST, lastHardYear=LAST_HARD, years=idx,
    taxFirstYear=1930, komSkatt=kom, begravning=beg,
    cohortAges=dict(dIP=61, dIPn=61, dPPn=61, mIP=61, arvIP1=17, arvIP2=60, arvPP=15),
    cohorts={str(k): val for k, val in cohorts.items()},
    riktalder=dict(firstCohort=min(rikt), lowest=[rikt[k][0] for k in sorted(rikt)], rikt=[rikt[k][1] for k in sorted(rikt)]),
)
json.dump(out, open("typfall.json", "w"), separators=(",", ":"))
import os
print("size", os.path.getsize("typfall.json"))
print({k: idx[k][-3:] for k in idx})
print(cohorts[1959]["dIP"][:8], cohorts[1959]["dIPn"][:8])
print(cohorts[1959]["mIP"][:8])
print(cohorts[1959]["arvIP1"][-6:], cohorts[1959]["arvIP2"][:8], cohorts[1959]["arvPP"][-6:])
